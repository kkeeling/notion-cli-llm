import { Args, Command, Flags, ux } from '@oclif/core'
import * as notion from '../../notion'
import {
  PageObjectResponse,
  DatabaseObjectResponse,
  QueryDatabaseResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints'
import * as fs from 'fs'
import * as path from 'path'
import * as dayjs from 'dayjs'
import {
  buildFilterPagePrompt,
  buildDatabaseQueryFilter,
  getDbChoices,
  getPromptChoices,
  getFilterFields,
  onCancel,
  outputRawJson,
  getDbTitle,
  getPageTitle,
} from '../../helper'
import { client } from '../../notion'

const prompts = require('prompts')

export default class DbQuery extends Command {
  static description = 'Query a database with powerful filtering, sorting, and pagination. Supports interactive filter building.'

  static aliases: string[] = ['db:q']

  static examples = [
    {
      description: 'Interactive mode - build and save filters',
      command: `$ notion-cli db query`,
    },
    {
      description: 'Query all pages from a database',
      command: `$ notion-cli db query DATABASE_ID`,
    },
    {
      description: 'Query with inline filter (active tasks)',
      command: `$ notion-cli db query DATABASE_ID -a '{"property":"Status","select":{"equals":"In Progress"}}'`,
    },
    {
      description: 'Query with saved filter file',
      command: `$ notion-cli db query DATABASE_ID -f ./filters/active-tasks.json`,
    },
    {
      description: 'Get all results sorted by priority',
      command: `$ notion-cli db query DATABASE_ID --pageAll -s Priority -d desc`,
    },
    {
      description: 'Export query results as CSV',
      command: `$ notion-cli db query --csv DATABASE_ID`,
    },
    {
      description: 'Query a db with a specific database_id and output raw json',
      command: `$ notion-cli db query --raw DATABASE_ID`,
    },
    {
      description: 'Query a db with a specific database_id and page size',
      command: `$ notion-cli db query -s 10 DATABASE_ID`,
    },
    {
      description: 'Query a db with a specific database_id and get all pages',
      command: `$ notion-cli db query -A DATABASE_ID`,
    },
    {
      description: 'Query a db with a specific database_id and sort property and sort direction',
      command: `$ notion-cli db query -s Name -d desc DATABASE_ID`,
    },
  ]

  static args = {
    database_id: Args.string({
      required: false,
    }),
  }

  static flags = {
    rawFilter: Flags.string({
      char: 'a',
      description: 'JSON stringified filter string',
    }),
    fileFilter: Flags.string({
      char: 'f',
      description: 'JSON filter file path',
    }),
    pageSize: Flags.integer({
      char: 'p',
      description: 'The number of results to return(1-100). ',
      min: 1,
      max: 100,
      default: 10,
    }),
    pageAll: Flags.boolean({
      char: 'A',
      description: 'get all pages',
      default: false,
    }),
    sortProperty: Flags.string({
      char: 's',
      description: 'The property to sort results by',
    }),
    sortDirection: Flags.string({
      char: 'd',
      options: ['asc', 'desc'],
      description: 'The direction to sort results',
      default: 'asc',
    }),
    raw: Flags.boolean({
      char: 'r',
      description: 'output raw json',
      default: false,
    }),
    ...ux.table.flags(),
  }

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(DbQuery)

    let databaseId = args.database_id
    let queryParams: QueryDatabaseParameters
    try {
      // If args(database_id) is set, run as non-interactive mode.
      if (Object.keys(args).length !== 0) {
        if (flags.rawFilter != undefined) {
          const filter = JSON.parse(flags.rawFilter)
          queryParams = {
            database_id: databaseId,
            filter: filter as QueryDatabaseParameters['filter'],
            page_size: flags.pageSize,
          }
        } else if (flags.fileFilter != undefined) {
          const fp = path.join('./', flags.fileFilter)
          const fj = fs.readFileSync(fp, { encoding: 'utf-8' })
          const filter = JSON.parse(fj)
          queryParams = {
            database_id: databaseId,
            filter: filter as QueryDatabaseParameters['filter'],
            page_size: flags.pageSize,
          }
        } else {
          let sorts: QueryDatabaseParameters['sorts'] = []
          const direction = flags.sortDirection == 'desc' ? 'descending' : 'ascending'
          if (flags.sortProperty != undefined) {
            sorts.push({
              property: flags.sortProperty,
              direction: direction,
            })
          }
          queryParams = {
            database_id: databaseId,
            sorts: sorts,
            page_size: flags.pageSize,
          }
        }
      } else {
        // interactive mode start
        let filter: object | undefined

        // select a database
        const dbChoices = await getDbChoices()
        const promptSelectedDbResult = await prompts(
          [
            {
              message: 'Select a database to query',
              type: 'autocomplete',
              name: 'database_id',
              choices: dbChoices,
            },
          ],
          { onCancel }
        )
        if (process.env.DEBUG) {
          this.log(promptSelectedDbResult)
        }
        databaseId = promptSelectedDbResult.database_id

        // select a filter
        let CombineOperator = undefined
        const promptAddFilterResult = await prompts(
          [
            {
              message: 'Add filter?',
              type: 'confirm',
              name: 'value',
              initial: true,
            },
          ],
          { onCancel }
        )

        const selectedDb = await notion.retrieveDb(databaseId)
        const dbPropsChoices = await getPromptChoices(selectedDb)
        if (process.env.DEBUG) {
          console.dir(dbPropsChoices, { depth: null })
        }

        while (promptAddFilterResult.value) {
          // Choice the operator first time and keep using it.
          if (filter != undefined && CombineOperator == undefined) {
            const promptAndOrPropResult = await prompts(
              [
                {
                  message: 'Select and/or',
                  type: 'autocomplete',
                  name: 'operator',
                  choices: [{ title: 'and' }, { title: 'or' }],
                },
              ],
              { onCancel }
            )
            // rebuild filter object with choose operator
            const tmp = filter
            CombineOperator = promptAndOrPropResult.operator
            filter = { [CombineOperator]: [tmp] }
            if (process.env.DEBUG) {
              console.dir(filter, { depth: null })
            }
          }

          const promptSelectFilterPropResult = await prompts(
            [
              {
                message: 'Select a property for filter by',
                type: 'autocomplete',
                name: 'property',
                choices: dbPropsChoices,
              },
            ],
            { onCancel }
          )
          // 選ばれたプロパティのタイプに応じて次のプロンプト情報を作成する.
          // 同一DBでプロパティ名は必ずユニークなので対象プロパティが確定する
          const selectedProp = Object.entries(selectedDb.properties).find(([_, prop]) => {
            // prompt result => "prperty_name <property_type>"
            return prop.name == promptSelectFilterPropResult.property.split(' <')[0]
          })
          if (process.env.DEBUG) {
            console.dir(selectedProp[1], { depth: null })
          }
          if (selectedProp[1].type == undefined) {
            this.logToStderr('selectedProp.type is undefined')
            return
          }

          const fieldChoices = await getFilterFields(selectedProp[1].type)
          if (fieldChoices == null) {
            this.logToStderr('selected property is not supported to filter')
            continue
          }

          const promptFieldResult = await prompts(
            [
              {
                message: 'Select a field of filter',
                type: 'autocomplete',
                name: 'value',
                choices: fieldChoices,
              },
            ],
            { onCancel }
          )
          const filterField = promptFieldResult.value
          if (process.env.DEBUG) {
            console.log(`filterField: ${filterField}`)
          }

          let filterValue: string | string[] | boolean = true
          if (!['is_empty', 'is_not_empty'].includes(filterField)) {
            const fpp = await buildFilterPagePrompt(selectedProp[1])
            const promptFilterPropResult = await prompts([fpp], { onCancel })
            filterValue = promptFilterPropResult.value
          }
          if (process.env.DEBUG) {
            console.log(`filterValue: ${filterValue}`)
          }
          const filterObj = await buildDatabaseQueryFilter(
            selectedProp[1].name,
            selectedProp[1].type,
            filterField,
            filterValue
          )
          if (filterObj == null) {
            this.logToStderr('buildDatabaseQueryFilter error')
            this.exit(1)
          }

          // set or push a build filter
          if (filter == undefined) {
            filter = filterObj
          } else {
            filter[CombineOperator].push(filterObj)
          }
          if (process.env.DEBUG) {
            console.log(filter)
          }

          const promptConfirmAddFilterFinishResult = await prompts(
            [
              {
                message: 'Finish add filter?',
                type: 'confirm',
                name: 'value',
                initial: true,
              },
            ],
            { onCancel }
          )
          if (promptConfirmAddFilterFinishResult.value) {
            break
          }
        }

        queryParams = {
          database_id: databaseId,
          filter: filter as QueryDatabaseParameters['filter'],
          page_size: flags.pageSize,
        }

        // save filter to file
        if (filter != undefined) {
          console.log('')
          console.log('Filter:')
          console.dir(filter, { depth: null })
          console.log('')

          const promptConfirmSaveFilterResult = await prompts(
            [
              {
                message: 'Save this filter to a file?',
                type: 'confirm',
                name: 'value',
                initial: false,
              },
            ],
            { onCancel }
          )
          if (promptConfirmSaveFilterResult.value) {
            const promptFileNameResult = await prompts({
              message: 'Filename',
              type: 'text',
              name: 'filename',
              initial: dayjs().format('YYYYMMDD_HHmmss'),
            })
            const fileName = `${promptFileNameResult.filename}.json`
            fs.writeFileSync(fileName, JSON.stringify(filter, null, 2))
            this.logToStderr(`Saved to ${fileName}\n`)
          }
        }
      }
    } catch (e) {
      this.error(e, { exit: 1 })
    }

    let pages = []
    if (flags.pageAll) {
      pages = await notion.fetchAllPagesInDB(databaseId, queryParams.filter)
    } else {
      const res = await client.databases.query(queryParams)
      pages.push(...res.results)
    }

    // output
    if (flags.raw) {
      outputRawJson(pages)
      this.exit(0)
    } else {
      const columns = {
        title: {
          get: (row: DatabaseObjectResponse | PageObjectResponse) => {
            if (row.object == 'database') {
              return getDbTitle(row)
            }
            return getPageTitle(row)
          },
        },
        object: {},
        id: {},
        url: {},
      }
      const options = {
        printLine: this.log.bind(this),
        ...flags,
      }
      ux.table(pages, columns, options)
    }
  }
}
