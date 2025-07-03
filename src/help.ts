import { Help } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'

export default class CustomHelp extends Help {
  // Check if verbose help is requested
  private isVerbose(): boolean {
    return process.argv.includes('--help-verbose')
  }

  // Override showCommandHelp to handle verbose flag
  async showCommandHelp(command: any): Promise<void> {
    if (this.isVerbose()) {
      await this.showVerboseHelp([command.id])
    } else {
      await super.showCommandHelp(command)
    }
  }

  // Override showRootHelp to handle verbose flag
  async showRootHelp(): Promise<void> {
    if (this.isVerbose()) {
      await this.showVerboseHelp([])
    } else {
      await super.showRootHelp()
    }
  }

  async showVerboseHelp(argv: string[]): Promise<void> {
    // Load the enhanced help markdown file
    const enhancedHelpPath = path.join(__dirname, '..', 'ENHANCED_HELP.md')
    
    try {
      const helpContent = fs.readFileSync(enhancedHelpPath, 'utf8')
      
      // If a specific command is requested, try to extract that section
      if (argv.length > 0) {
        const command = argv[0]
        const section = this.extractCommandSection(helpContent, command)
        
        if (section) {
          console.log(section)
        } else {
          // If section not found, show full help
          console.log(helpContent)
        }
      } else {
        // Show full help
        console.log(helpContent)
      }
    } catch (error) {
      // Fallback to normal help if file not found
      console.error('Enhanced help file not found. Showing standard help.')
      if (argv.length > 0) {
        const command = this.config.findCommand(argv[0])
        if (command) {
          await super.showCommandHelp(command)
        }
      } else {
        await super.showRootHelp()
      }
    }
  }

  private extractCommandSection(content: string, command: string): string | null {
    // Try to extract the specific command section from the markdown
    const commandMap: { [key: string]: string } = {
      'block': '### Block Commands',
      'db': '### Database Commands',
      'database': '### Database Commands',
      'page': '### Page Commands',
      'user': '### User Commands',
      'search': '### Search Command',
    }

    const sectionHeader = commandMap[command.toLowerCase()]
    if (!sectionHeader) {
      return null
    }

    const sectionStart = content.indexOf(sectionHeader)
    if (sectionStart === -1) {
      return null
    }

    // Find the next section header at the same level
    const nextSectionMatch = content.substring(sectionStart + sectionHeader.length).match(/\n### /);
    let sectionEnd = content.length
    
    if (nextSectionMatch) {
      sectionEnd = sectionStart + sectionHeader.length + nextSectionMatch.index!
    }

    return content.substring(sectionStart, sectionEnd).trim()
  }

  // Override formatRoot to add --help-verbose flag info
  protected formatRoot(): string {
    let rootHelp = super.formatRoot()
    
    // Add global flags section if it doesn't exist
    if (!rootHelp.includes('GLOBAL FLAGS')) {
      const usageEnd = rootHelp.indexOf('\n\n', rootHelp.indexOf('USAGE'))
      if (usageEnd !== -1) {
        const globalFlags = `

GLOBAL FLAGS
  --help          Show help
  --help-verbose  Show comprehensive help with all examples and details
  --raw, -r       Output raw JSON response from Notion API
  --output=<fmt>  Output format: table (default), csv, json, yaml`
        rootHelp = rootHelp.slice(0, usageEnd) + globalFlags + rootHelp.slice(usageEnd)
      }
    }
    
    return rootHelp
  }
}