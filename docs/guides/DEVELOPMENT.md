# Development Guide

## Improved Monorepo Dev Experience

This monorepo now supports automatic dependency building during development. The base package (`@devlog/core`) will automatically rebuild when its source files change, ensuring application packages always have the latest changes.

### Available Development Scripts

#### Root Level Scripts
- `pnpm dev:mcp` - Runs MCP server with auto-building dependencies
- `pnpm dev:web` - Runs web app with auto-building dependencies

#### Package Level Scripts
- `pnpm --filter @devlog/mcp dev:full` - MCP server with dependencies (local version)
- `pnpm --filter @devlog/web dev:full` - Web app with dependencies (local version)

### How It Works

Each enhanced dev script uses `concurrently` to run multiple processes in parallel:

1. **Core Package**: `tsc --watch` for real-time TypeScript compilation  
2. **Application Package**: The main dev server/process

### Benefits

- **Automatic Dependency Updates**: Changes in base packages are immediately available in apps
- **No Manual Rebuilding**: No need to run `pnpm build` manually when dependencies change
- **Real-time Development**: See your changes across the entire stack instantly
- **Color-coded Output**: Easy to identify which package is outputting logs

### VS Code Tasks

The following VS Code tasks are available in the Command Palette (Ctrl/Cmd + Shift + P):

- **MCP Server: Dev (Full Stack)** - MCP with auto-building dependencies
- **Web: Dev (Full Stack)** - Web app with auto-building dependencies (global script)
- **Web: Dev (Local Full Stack)** - Web app with auto-building dependencies (local script)

### Development Workflow

1. **Start Development**: Use `pnpm dev:mcp` or `pnpm dev:web` to start development with all dependencies
2. **Edit Base Package**: Make changes to `@devlog/core`
3. **See Changes**: The TypeScript compiler will automatically rebuild, and your app will pick up the changes
4. **Edit App Code**: Continue developing your application normally

### Package Structure

```
packages/
├── core/           # Base package - core functionality and TypeScript types
├── mcp/            # Application package - MCP server
└── web/            # Application package - Web interface
```

### Dependencies

- **concurrently**: Runs multiple npm scripts in parallel with colored output
- **TypeScript watch mode**: Automatic compilation on file changes
- **PNPM workspace**: Efficient package linking and dependency management

### Troubleshooting

If you encounter issues:

1. **Clean and rebuild**: `pnpm clean && pnpm build`
2. **Reinstall dependencies**: `pnpm install`
3. **Check process conflicts**: Make sure no other dev processes are running on the same ports
4. **Check VS Code tasks**: Use the integrated terminal to see detailed output

### Legacy Scripts

The following scripts are still available for specific use cases:

- `pnpm dev` - MCP server only (no dependency watching)
- `pnpm --filter @devlog/web dev` - Web app only (no dependency watching)
- `pnpm --filter @devlog/core dev` - Core package only
