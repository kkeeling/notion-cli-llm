# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**notion-cli-llm** is a TypeScript-based command-line interface for the Notion API, built on the oclif framework. It provides comprehensive access to Notion's API endpoints with support for multiple output formats and interactive mode capabilities.

## Key Commands for Development

### Build & Development
```bash
# Install dependencies
yarn install

# Build the project (compiles TypeScript to dist/)
yarn build

# Run in development mode
./bin/dev <command>

# Run the production version
./bin/run <command>

# Watch mode for development
tsc -w
```

### Testing
```bash
# Run all tests
yarn test

# Run a specific test file
yarn test test/commands/page/retrieve.test.ts

# Run tests with mocha directly
npx mocha test/**/*.test.ts
```

### Code Quality
```bash
# Run ESLint
yarn lint

# Format code with Prettier (manual - no script defined)
npx prettier --write "src/**/*.ts"
```

### Docker
```bash
# Build Docker image
docker build -t notion-cli .

# Run with Docker
docker run -e NOTION_TOKEN=secret_xxx... notion-cli <command>
```

## Architecture & Code Structure

### Core Components

1. **Command Structure** (`/src/commands/`):
   - Each entity type (block, page, db, user) has its own subdirectory
   - Commands follow the pattern: `<entity>/<action>.ts`
   - All commands extend `@oclif/core/Command`
   - Interactive mode is primarily implemented in database commands

2. **Notion API Integration** (`/src/notion.ts`):
   - Centralizes all Notion API client interactions
   - Wraps the `@notionhq/client` with utility functions
   - Handles authentication via `NOTION_TOKEN` environment variable
   - Key functions: `getNotionClient()`, `getNotionUrl()`, various formatting utilities

3. **Output Formatting** (`/src/helper.ts`):
   - `printResponse()` - Main function for formatting API responses
   - Supports: table (default), CSV, JSON, YAML, and raw JSON
   - Uses oclif's `ux.table` for structured output
   - Extracts key fields (title, object, id, url) for formatted views

4. **Type System** (`/src/interface.ts`):
   - Defines custom interfaces extending Notion's types
   - Key interfaces: `PageResponse`, `UserResponse`, `SearchResponse`
   - Provides type safety for command implementations

### Command Patterns

Most commands follow this structure:
```typescript
export default class CommandName extends Command {
  static description = '...';
  static examples = ['...'];
  static flags = {
    // Common flags: raw, output, help
  };
  static args = {
    // Command-specific arguments
  };
  
  async run(): Promise<void> {
    // 1. Parse arguments and flags
    // 2. Get Notion client
    // 3. Make API call
    // 4. Format and print response using printResponse()
  }
}
```

### Interactive Mode (Database Commands)

Database commands support interactive mode when run without arguments:
- Uses `prompts` library for user interaction
- Builds filter conditions step-by-step
- Can save/load filter configurations as JSON files
- Located in `/src/commands/db/*.ts`

### LLM Integration

The `@tryfabric/martian` dependency suggests LLM capabilities:
- Currently appears unused in the codebase
- Potential for natural language query translation
- Could enhance interactive mode with AI assistance

## Testing Approach

- Test files mirror the command structure
- Uses Mocha + Chai for assertions
- Test pattern: `test/commands/<entity>/<action>.test.ts`
- Helper initialization in `test/helpers/init.js`
- Focus on command execution and output formatting

## Environment Configuration

Required environment variable:
- `NOTION_TOKEN`: Your Notion integration token

## Development Tips

1. **Adding New Commands**:
   - Create file in appropriate `/src/commands/<entity>/` directory
   - Extend `Command` from `@oclif/core`
   - Implement static metadata and `run()` method
   - Add corresponding test file
   - Update README.md with new command documentation

2. **Working with Notion API**:
   - Use functions from `/src/notion.ts` for API calls
   - Handle pagination for list operations
   - Check Notion API docs for property structure

3. **Output Formatting**:
   - Use `printResponse()` from `/src/helper.ts`
   - For custom formatting, extend the helper functions
   - Raw flag (`--raw`) bypasses all formatting

4. **Interactive Mode Development**:
   - Study existing database command implementations
   - Use `prompts` library for user input
   - Consider JSON file persistence for complex configurations