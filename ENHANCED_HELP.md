# Notion CLI - Comprehensive Reference

## Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Output Formats](#output-formats)
4. [Commands Reference](#commands-reference)
   - [Block Commands](#block-commands)
   - [Database Commands](#database-commands)
   - [Page Commands](#page-commands)
   - [User Commands](#user-commands)
   - [Search Command](#search-command)
5. [Interactive Mode Guide](#interactive-mode-guide)
6. [JSON Input Examples](#json-input-examples)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

## Quick Start

The Notion CLI provides command-line access to your Notion workspace through the official Notion API.

### Installation
```bash
# npm
npm install -g @litencatt/notion-cli

# Docker
docker pull ghcr.io/litencatt/notion-cli
```

### Basic Setup
```bash
# Set your Notion integration token
export NOTION_TOKEN=secret_xxx...

# Test connection by retrieving a page
notion-cli page retrieve <PAGE_ID>
```

### Finding IDs
- **Page ID**: Found in page URLs: `https://notion.so/Page-Title-<PAGE_ID>`
- **Database ID**: Found in database URLs: `https://notion.so/<WORKSPACE>/views/<DATABASE_ID>`
- **Block ID**: Use developer tools or retrieve page children to find block IDs

## Authentication

The CLI requires a Notion integration token. Create one at: https://developers.notion.com/docs/create-a-notion-integration

```bash
# Set token as environment variable
export NOTION_TOKEN=secret_xxx...

# Or use with Docker
docker run -e NOTION_TOKEN=secret_xxx... ghcr.io/litencatt/notion-cli <command>
```

## Output Formats

The CLI supports multiple output formats for different use cases:

### Table Format (Default)
Human-readable table with key fields (title, object, id, url):
```bash
$ notion-cli page retrieve abc123
 Title      Object Id     Url
 ────────── ────── ───── ─────────────────
 My Page    page   abc123 https://notion.so/...
```

### CSV Format
```bash
$ notion-cli page retrieve abc123 --output csv
# or
$ notion-cli page retrieve abc123 --csv

Title,Object,Id,Url
My Page,page,abc123,https://notion.so/...
```

### JSON Format (Processed)
```bash
$ notion-cli page retrieve abc123 --output json
[
  {
    "title": "My Page",
    "object": "page",
    "id": "abc123",
    "url": "https://notion.so/..."
  }
]
```

### YAML Format
```bash
$ notion-cli page retrieve abc123 --output yaml
- title: My Page
  object: page
  id: abc123
  url: https://notion.so/...
```

### Raw JSON (Notion API Response)
```bash
$ notion-cli page retrieve abc123 --raw
{
  "object": "page",
  "id": "abc123",
  "created_time": "2023-01-01T00:00:00.000Z",
  "properties": { ... },
  // Full API response
}
```

## Commands Reference

### Block Commands

Commands for managing Notion blocks (paragraphs, headings, lists, etc.).

#### `block append`
Appends new child blocks to a parent block.

**Syntax:**
```bash
notion-cli block append <BLOCK_ID> <CHILDREN> [AFTER]
```

**Arguments:**
- `BLOCK_ID` (required): The ID of the parent block
- `CHILDREN` (required): JSON array of block objects to append
- `AFTER` (optional): ID of existing child block to insert after

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# Append a simple paragraph
notion-cli block append abc123 '[{"type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Hello world"}}]}}]'

# Append multiple blocks
notion-cli block append abc123 '[
  {
    "type": "heading_2",
    "heading_2": {
      "rich_text": [{"type": "text", "text": {"content": "Section Title"}}]
    }
  },
  {
    "type": "paragraph",
    "paragraph": {
      "rich_text": [{"type": "text", "text": {"content": "Section content"}}]
    }
  },
  {
    "type": "bulleted_list_item",
    "bulleted_list_item": {
      "rich_text": [{"type": "text", "text": {"content": "First bullet point"}}]
    }
  }
]'

# Append after a specific block
notion-cli block append abc123 '[{"type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Inserted paragraph"}}]}}]' xyz789

# Using a JSON file
echo '[{"type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"From file"}}]}}]' > blocks.json
notion-cli block append abc123 "$(cat blocks.json)"
```

**Limitations:**
- Currently requires manually constructing JSON (no interactive mode)
- See [JSON Input Examples](#json-input-examples) for block type structures

#### `block delete`
Archives (soft deletes) a block.

**Syntax:**
```bash
notion-cli block delete <BLOCK_ID>
```

**Arguments:**
- `BLOCK_ID` (required): The ID of the block to delete

**Flags:**
- `--raw, -r`: Output raw JSON response

**Examples:**
```bash
# Delete a block
notion-cli block delete abc123

# Delete and see raw response
notion-cli block delete abc123 --raw
```

#### `block retrieve`
Retrieves a single block object.

**Syntax:**
```bash
notion-cli block retrieve <BLOCK_ID>
```

**Arguments:**
- `BLOCK_ID` (required): The ID of the block to retrieve

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# Get block information
notion-cli block retrieve abc123

# Get full block details
notion-cli block retrieve abc123 --raw

# Export as JSON
notion-cli block retrieve abc123 --output json
```

#### `block retrieve children`
Retrieves all child blocks of a parent block.

**Syntax:**
```bash
notion-cli block retrieve children <BLOCK_ID>
```

**Arguments:**
- `BLOCK_ID` (required): The ID of the parent block

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# List all children of a block
notion-cli block retrieve children abc123

# Get children with full details
notion-cli block retrieve children abc123 --raw

# Export children list as CSV
notion-cli block retrieve children abc123 --csv
```

**Limitations:**
- No pagination support yet (returns first 100 children only)

#### `block update`
Updates a block.

**Syntax:**
```bash
notion-cli block update <BLOCK_ID>
```

**Arguments:**
- `BLOCK_ID` (required): The ID of the block to update

**Flags:**
- `--archived, -a`: Archive the block
- `--raw, -r`: Output raw JSON response

**Examples:**
```bash
# Archive a block
notion-cli block update abc123 --archived

# Archive and see response
notion-cli block update abc123 --archived --raw
```

**Limitations:**
- Currently only supports archiving blocks
- Cannot update block content or type

### Database Commands

Commands for managing Notion databases with powerful querying and filtering capabilities.

#### `db create`
Creates a new database as a child of a page.

**Syntax:**
```bash
notion-cli db create <PAGE_ID>
```

**Arguments:**
- `PAGE_ID` (required): The ID of the parent page

**Flags:**
- `--title, -t <value>`: Database title (prompts if not provided)
- `--raw, -r`: Output raw JSON response

**Interactive Mode:**
If title is not provided via flag, prompts for input.

**Examples:**
```bash
# Create with title flag
notion-cli db create abc123 --title "Project Tasks"

# Create interactively
notion-cli db create abc123
# > Enter database title: Project Tasks

# Create and get raw response
notion-cli db create abc123 -t "Tasks" --raw
```

#### `db query`
Query a database with filtering, sorting, and pagination.

**Syntax:**
```bash
notion-cli db query [DATABASE_ID]
```

**Arguments:**
- `DATABASE_ID` (optional): The database ID (enters interactive mode if omitted)

**Flags:**
- `--rawFilter, -a <value>`: Raw JSON filter string
- `--fileFilter, -f <value>`: Path to JSON filter file
- `--pageSize, -p <value>`: Results per page (1-100, default: 10)
- `--pageAll, -A`: Fetch all pages (ignores page size)
- `--sortProperty, -s <value>`: Property name to sort by
- `--sortDirection, -d <asc|desc>`: Sort direction (default: asc)
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Interactive Mode Features:**
1. Database selection from list
2. Filter builder with property selection
3. AND/OR condition builder
4. Save filters to reusable JSON files
5. Test queries before saving

**Examples:**
```bash
# Interactive mode (recommended for complex queries)
notion-cli db query
# 1. Select database from list
# 2. Build filters interactively
# 3. Save filter for reuse

# Query specific database
notion-cli db query db123

# Query with inline filter
notion-cli db query db123 --rawFilter '{
  "and": [
    {"property": "Status", "select": {"equals": "In Progress"}},
    {"property": "Priority", "select": {"equals": "High"}}
  ]
}'

# Query with saved filter file
notion-cli db query db123 --fileFilter ./filters/active-tasks.json

# Get all results as CSV
notion-cli db query db123 --pageAll --csv > results.csv

# Sort by property
notion-cli db query db123 -s "Due Date" -d desc

# Complex example with multiple options
notion-cli db query db123 \
  --fileFilter ./filters/current-sprint.json \
  --sortProperty "Priority" \
  --sortDirection desc \
  --pageAll \
  --output json > sprint-tasks.json
```

**Filter File Example** (`filters/active-tasks.json`):
```json
{
  "and": [
    {
      "property": "Status",
      "select": {
        "does_not_equal": "Done"
      }
    },
    {
      "property": "Archived",
      "checkbox": {
        "equals": false
      }
    }
  ]
}
```

#### `db retrieve`
Retrieves database information.

**Syntax:**
```bash
notion-cli db retrieve [DATABASE_ID]
```

**Arguments:**
- `DATABASE_ID` (optional): The database ID (prompts for selection if omitted)

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Interactive Mode:**
Shows list of databases to select from if ID not provided.

**Examples:**
```bash
# Interactive selection
notion-cli db retrieve

# Retrieve specific database
notion-cli db retrieve db123

# Get full database schema
notion-cli db retrieve db123 --raw
```

#### `db update`
Updates database properties.

**Syntax:**
```bash
notion-cli db update [DATABASE_ID]
```

**Arguments:**
- `DATABASE_ID` (optional): The database ID (prompts if omitted)

**Flags:**
- `--title, -t <value>`: New database title
- `--raw, -r`: Output raw JSON response

**Interactive Mode:**
1. Select database if ID not provided
2. Enter new title if not provided via flag

**Examples:**
```bash
# Update with flags
notion-cli db update db123 --title "Updated Tasks"

# Interactive update
notion-cli db update
# > Select database
# > Enter new title

# Update specific database interactively
notion-cli db update db123
# > Enter new title: Renamed Database
```

**Limitations:**
- Currently only supports updating title
- Cannot modify database schema or properties

### Page Commands

Commands for creating and managing Notion pages.

#### `page create`
Creates a new page in a parent page or database.

**Syntax:**
```bash
notion-cli page create
```

**Flags:**
- `--parent_page_id, -p <value>`: Parent page ID
- `--parent_db_id, -d <value>`: Parent database ID
- `--file_path, -f <value>`: Markdown file to import as content
- `--raw, -r`: Output raw JSON response

**Examples:**
```bash
# Create empty page in another page
notion-cli page create --parent_page_id abc123

# Create page in database
notion-cli page create --parent_db_id db123

# Create page from markdown file
notion-cli page create --file_path ./meeting-notes.md --parent_page_id abc123

# Create from markdown in database
notion-cli page create -f ./task.md -d db123

# Complex markdown import
echo "# Project Plan
## Overview
This is the project overview.

## Tasks
- [ ] Task 1
- [ ] Task 2

## Timeline
| Phase | Duration |
|-------|----------|
| Design | 2 weeks |
| Build | 4 weeks |" > project.md

notion-cli page create -f project.md -p abc123
```

**Notes:**
- When using `--file_path`, the filename becomes the page title
- Markdown is converted to Notion blocks
- Supports tables, lists, checkboxes, headers, etc.

#### `page retrieve`
Retrieves page information or exports as markdown.

**Syntax:**
```bash
notion-cli page retrieve <PAGE_ID>
```

**Arguments:**
- `PAGE_ID` (required): The page ID

**Flags:**
- `--markdown, -m`: Export page content as markdown
- `--filter_properties, -p <value>`: Comma-separated property IDs
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# Get page info
notion-cli page retrieve page123

# Export page as markdown
notion-cli page retrieve page123 --markdown > page.md

# Get specific properties only
notion-cli page retrieve page123 -p "title,status,assignee"

# Get full page object
notion-cli page retrieve page123 --raw

# Export page metadata as JSON
notion-cli page retrieve page123 --output json
```

#### `page retrieve property_item`
Retrieves a specific property from a page.

**Syntax:**
```bash
notion-cli page retrieve property_item <PAGE_ID> <PROPERTY_ID>
```

**Arguments:**
- `PAGE_ID` (required): The page ID
- `PROPERTY_ID` (required): The property ID

**Examples:**
```bash
# Get specific property value
notion-cli page retrieve property_item page123 prop456

# Property IDs can be found in the raw page response
notion-cli page retrieve page123 --raw | grep property
```

**Note:** This command only outputs raw JSON.

#### `page update`
Updates page properties.

**Syntax:**
```bash
notion-cli page update <PAGE_ID>
```

**Arguments:**
- `PAGE_ID` (required): The page ID

**Flags:**
- `--archived, -a`: Archive the page
- `--un_archive, -u`: Restore archived page
- `--raw, -r`: Output raw JSON response

**Examples:**
```bash
# Archive a page
notion-cli page update page123 --archived

# Restore archived page
notion-cli page update page123 --un_archive

# Archive and see response
notion-cli page update page123 -a --raw
```

**Limitations:**
- Currently only supports archiving/unarchiving
- Cannot update page properties or content

### User Commands

Commands for managing workspace users.

#### `user list`
Lists all users in the workspace.

**Syntax:**
```bash
notion-cli user list
```

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# List all users
notion-cli user list

# Export user list as CSV
notion-cli user list --csv > users.csv

# Get full user details
notion-cli user list --raw
```

#### `user retrieve`
Retrieves information about a specific user.

**Syntax:**
```bash
notion-cli user retrieve [USER_ID]
```

**Arguments:**
- `USER_ID` (optional): The user ID

**Flags:**
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# Retrieve specific user
notion-cli user retrieve user123

# Get user with full details
notion-cli user retrieve user123 --raw
```

#### `user retrieve bot`
Retrieves information about the integration bot user.

**Syntax:**
```bash
notion-cli user retrieve bot
```

**Flags:**
- `--raw, -r`: Output raw JSON response

**Examples:**
```bash
# Get bot user info
notion-cli user retrieve bot

# Get bot details
notion-cli user retrieve bot --raw
```

### Search Command

Search across pages and databases in your workspace.

#### `search`
Search by title across all accessible pages and databases.

**Syntax:**
```bash
notion-cli search
```

**Flags:**
- `--query, -q <value>`: Search query text
- `--sort_direction, -d <asc|desc>`: Sort by last_edited_time (default: desc)
- `--property, -p <database|page>`: Filter to only databases or pages
- `--start_cursor, -c <value>`: Pagination cursor
- `--page_size, -s <value>`: Results per page (1-100, default: 5)
- `--raw, -r`: Output raw JSON response
- `--output <format>`: Output format (csv, json, yaml)

**Examples:**
```bash
# Search for pages containing "meeting"
notion-cli search -q "meeting"

# Search only databases
notion-cli search -q "project" -p database

# Search with more results
notion-cli search -q "todo" -s 20

# Search and export results
notion-cli search -q "Q4 planning" --output json > q4-docs.json

# Search with oldest first
notion-cli search -q "archive" -d asc

# Paginated search
notion-cli search -q "notes" -s 10
# Copy start_cursor from response for next page
notion-cli search -q "notes" -s 10 -c "xxx-cursor-xxx"
```

## Interactive Mode Guide

Several commands support interactive mode for easier use without memorizing IDs or syntax.

### Database Commands Interactive Features

#### `db query` Interactive Mode
The most powerful interactive feature. When run without arguments:

1. **Database Selection**
   - Shows numbered list of all databases
   - Select by number
   
2. **Filter Building**
   - Choose to add filters or query all
   - Select property to filter
   - Choose filter type based on property
   - Build complex AND/OR conditions
   
3. **Filter Saving**
   - Option to save filter as JSON file
   - Reuse saved filters with `--fileFilter`

**Interactive Flow Example:**
```
$ notion-cli db query

? Select a database:
  1) Project Tasks
  2) Meeting Notes
  3) Team Directory
> 1

? Add filter conditions? (y/N) y

? Select a property to filter:
  1) Status (select)
  2) Priority (select)
  3) Due Date (date)
  4) Assigned (people)
> 1

? Select filter type:
  1) equals
  2) does_not_equal
  3) is_empty
  4) is_not_empty
> 1

? Select value:
  1) Not Started
  2) In Progress
  3) Done
> 2

? Add another condition? (y/N) y
? Condition type: (and/or) and

[... continue building filter ...]

? Save this filter to a file? (y/N) y
? Enter filename: active-tasks.json

Filter saved to: active-tasks.json
Querying database...
```

#### `db retrieve` Interactive Mode
When run without DATABASE_ID:
- Shows list of all databases
- Select by number

#### `db update` Interactive Mode
When run without arguments:
- Select database from list
- Enter new title

### Using Saved Configurations

Once you've built filters interactively, reuse them:

```bash
# Reuse saved filter
notion-cli db query db123 --fileFilter ./filters/active-tasks.json

# Combine saved filter with other options
notion-cli db query db123 \
  --fileFilter ./filters/this-week.json \
  --sortProperty "Priority" \
  --pageAll \
  --csv > weekly-tasks.csv
```

## JSON Input Examples

### Block Types for `block append`

#### Paragraph Block
```json
{
  "type": "paragraph",
  "paragraph": {
    "rich_text": [{
      "type": "text",
      "text": {
        "content": "This is a paragraph.",
        "link": null
      }
    }],
    "color": "default"
  }
}
```

#### Heading Blocks
```json
{
  "type": "heading_1",
  "heading_1": {
    "rich_text": [{
      "type": "text",
      "text": {"content": "Main Heading"}
    }]
  }
}
```

#### List Items
```json
{
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [{
      "type": "text",
      "text": {"content": "Bullet point"}
    }]
  }
}
```

```json
{
  "type": "numbered_list_item",
  "numbered_list_item": {
    "rich_text": [{
      "type": "text",
      "text": {"content": "Numbered item"}
    }]
  }
}
```

#### To-Do Item
```json
{
  "type": "to_do",
  "to_do": {
    "rich_text": [{
      "type": "text",
      "text": {"content": "Task description"}
    }],
    "checked": false
  }
}
```

#### Code Block
```json
{
  "type": "code",
  "code": {
    "rich_text": [{
      "type": "text",
      "text": {"content": "console.log('Hello, World!');"}
    }],
    "language": "javascript"
  }
}
```

#### Divider
```json
{
  "type": "divider",
  "divider": {}
}
```

### Database Query Filters

#### Simple Property Filter
```json
{
  "property": "Status",
  "select": {
    "equals": "In Progress"
  }
}
```

#### AND Condition
```json
{
  "and": [
    {
      "property": "Status",
      "select": {"equals": "In Progress"}
    },
    {
      "property": "Priority",
      "select": {"equals": "High"}
    }
  ]
}
```

#### OR Condition
```json
{
  "or": [
    {
      "property": "Status",
      "select": {"equals": "In Progress"}
    },
    {
      "property": "Status",
      "select": {"equals": "Review"}
    }
  ]
}
```

#### Date Filters
```json
{
  "property": "Due Date",
  "date": {
    "on_or_before": "2023-12-31"
  }
}
```

#### Complex Nested Filter
```json
{
  "and": [
    {
      "or": [
        {"property": "Status", "select": {"equals": "In Progress"}},
        {"property": "Status", "select": {"equals": "Review"}}
      ]
    },
    {
      "property": "Assigned",
      "people": {"is_not_empty": true}
    },
    {
      "property": "Due Date",
      "date": {"next_week": {}}
    }
  ]
}
```

## Common Workflows

### Workflow 1: Daily Task Management
```bash
# 1. Create today's task filter interactively
notion-cli db query
# Save as "today-tasks.json"

# 2. Morning: Check today's tasks
notion-cli db query TASK_DB_ID --fileFilter today-tasks.json

# 3. Create new task from markdown
echo "# Fix login bug
Priority: High
Due: Today

## Description
Users reporting login timeout issues.

## Steps
- [ ] Reproduce issue
- [ ] Debug timeout
- [ ] Deploy fix" > bug-fix.md

notion-cli page create -f bug-fix.md -d TASK_DB_ID

# 4. Export completed tasks
notion-cli db query TASK_DB_ID \
  --rawFilter '{"property":"Status","select":{"equals":"Done"}}' \
  --csv > completed-tasks.csv
```

### Workflow 2: Content Migration
```bash
# 1. Export pages as markdown
for page_id in page1 page2 page3; do
  notion-cli page retrieve $page_id --markdown > "$page_id.md"
done

# 2. Process/edit markdown files
# ... make changes ...

# 3. Import updated content
for file in *.md; do
  notion-cli page create -f "$file" -p PARENT_PAGE_ID
done
```

### Workflow 3: Database Reporting
```bash
# 1. Create reusable filters
echo '{"property":"Quarter","select":{"equals":"Q4"}}' > q4-filter.json

# 2. Generate reports
notion-cli db query SALES_DB_ID \
  --fileFilter q4-filter.json \
  --pageAll \
  --output json | jq '.[] | {title,revenue,status}' > q4-report.json

# 3. Archive old entries
notion-cli db query SALES_DB_ID \
  --rawFilter '{"property":"Year","number":{"less_than":2023}}' \
  --pageAll \
  --output json | jq -r '.[].id' | while read id; do
    notion-cli page update "$id" --archived
done
```

### Workflow 4: Team Directory Management
```bash
# 1. List all users
notion-cli user list --csv > workspace-users.csv

# 2. Search for team pages
notion-cli search -q "team" -p page --page_size 20

# 3. Bulk create team pages
for team in "Engineering" "Marketing" "Sales"; do
  notion-cli page create --parent_page_id DIRECTORY_ID \
    --file_path "./teams/$team.md"
done
```

## Troubleshooting

### Common Issues

#### "NOTION_TOKEN not set"
```bash
# Set your integration token
export NOTION_TOKEN=secret_xxx...

# Verify it's set
echo $NOTION_TOKEN
```

#### "Page/Database not found"
- Ensure the integration has access to the page/database
- Check sharing settings in Notion
- Verify the ID is correct (no extra characters)

#### JSON Parse Errors
```bash
# Validate JSON before using
echo '{"your":"json"}' | jq .

# Use file input for complex JSON
cat complex-filter.json | jq .
notion-cli db query --fileFilter complex-filter.json
```

#### Rate Limiting
The Notion API has rate limits. If you encounter 429 errors:
- Add delays between bulk operations
- Use `--pageSize` to reduce requests
- Implement exponential backoff in scripts

### Debugging Tips

1. **Use --raw flag** to see full API responses
2. **Check property names** are exact matches (case-sensitive)
3. **Validate IDs** don't contain URL parts
4. **Test filters** interactively before using in scripts
5. **Save working examples** as JSON files for reference

### Getting IDs

#### Page ID from URL
```
https://www.notion.so/My-Page-abc123def456
                              ^^^^^^^^^^^^^^
                              This is the Page ID
```

#### Database ID from URL
```
https://www.notion.so/workspace/My-Database-xxx?v=yyy
                                            ^^^
                                            This is the Database ID
```

#### Finding Block IDs
```bash
# Get page children to see block IDs
notion-cli block retrieve children PAGE_ID --raw | jq '.results[] | {id,type}'
```

#### Finding Property IDs
```bash
# Get database schema with property IDs
notion-cli db retrieve DATABASE_ID --raw | jq '.properties'

# Get page properties
notion-cli page retrieve PAGE_ID --raw | jq '.properties'
```

## Advanced Examples

### Scripting with notion-cli

#### Backup Script
```bash
#!/bin/bash
# backup-notion.sh

BACKUP_DIR="notion-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup all databases
notion-cli db retrieve --output json | jq -r '.[].id' | while read db_id; do
  echo "Backing up database: $db_id"
  notion-cli db query "$db_id" --pageAll --raw > "$BACKUP_DIR/db-$db_id.json"
done

# Backup specific pages
for page_id in "${IMPORTANT_PAGES[@]}"; do
  echo "Backing up page: $page_id"
  notion-cli page retrieve "$page_id" --markdown > "$BACKUP_DIR/page-$page_id.md"
  notion-cli page retrieve "$page_id" --raw > "$BACKUP_DIR/page-$page_id.json"
done

echo "Backup complete: $BACKUP_DIR"
```

#### Monitoring Script
```bash
#!/bin/bash
# monitor-tasks.sh

# Check for overdue tasks
OVERDUE=$(notion-cli db query TASK_DB_ID \
  --rawFilter '{
    "and": [
      {"property": "Due Date", "date": {"past_week": {}}},
      {"property": "Status", "select": {"does_not_equal": "Done"}}
    ]
  }' \
  --output json | jq length)

if [ "$OVERDUE" -gt 0 ]; then
  echo "WARNING: $OVERDUE overdue tasks found!"
  # Send notification, email, etc.
fi
```

### Integration with Other Tools

#### With jq for JSON Processing
```bash
# Extract specific fields
notion-cli page retrieve PAGE_ID --raw | jq '{
  title: .properties.Name.title[0].text.content,
  created: .created_time,
  url: .url
}'

# Filter and transform
notion-cli db query DB_ID --pageAll --raw | jq '.results[] | select(.properties.Status.select.name == "Done") | {
  task: .properties.Name.title[0].text.content,
  completed: .last_edited_time
}'
```

#### With grep/awk for Text Processing
```bash
# Find all pages with specific content
notion-cli search -q "project" --page_size 100 --output csv | \
  awk -F',' '$2 == "page" {print $1, $3}'

# Count by type
notion-cli search -q "2023" --page_size 100 --output csv | \
  awk -F',' '{count[$2]++} END {for (type in count) print type, count[type]}'
```

#### GitHub Actions Integration
```yaml
name: Sync Notion Tasks
on:
  schedule:
    - cron: '0 9 * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Notion CLI
        run: npm install -g @litencatt/notion-cli
      
      - name: Check Sprint Tasks
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
        run: |
          notion-cli db query ${{ secrets.SPRINT_DB_ID }} \
            --fileFilter ./filters/current-sprint.json \
            --output json > sprint-tasks.json
          
      - name: Process Tasks
        run: |
          # Your processing logic here
          cat sprint-tasks.json | jq '.' > processed-tasks.json
```

## Tips and Best Practices

1. **Use Interactive Mode for Learning**: Start with interactive commands to understand the structure before scripting

2. **Save Filters as Files**: Build complex filters once interactively, then reuse them

3. **Combine with Unix Tools**: Use pipes, jq, grep, awk for powerful data processing

4. **Handle IDs Carefully**: Store frequently used IDs in environment variables or config files

5. **Test with --pageSize**: Use small page sizes when testing queries to avoid hitting rate limits

6. **Use --raw for Automation**: When scripting, use --raw to get consistent JSON output

7. **Backup Important Filters**: Keep your filter JSON files in version control

8. **Document Your Workflows**: Create README files with your common command patterns

This comprehensive guide covers all features of the Notion CLI. For the latest updates and contributions, visit: https://github.com/litencatt/notion-cli