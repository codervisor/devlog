# File Naming Conventions

This document outlines the standardized file naming conventions for the web package.

## React Components (`.tsx` files)

### Page Components

- **Pattern**: `PascalCase.tsx` or `page.tsx` (Next.js convention)
- **Examples**:
  - `ProjectDetailsPage.tsx`
  - `DashboardPage.tsx`
  - `page.tsx` (Next.js route files)

### Layout Components

- **Pattern**: `PascalCase.tsx`
- **Examples**:
  - `AppLayout.tsx`
  - `PageLayout.tsx`
  - `NavigationSidebar.tsx`

### Feature Components

- **Pattern**: `PascalCase.tsx`
- **Examples**:
  - `DevlogDetails.tsx`
  - `DevlogList.tsx`
  - `MarkdownEditor.tsx`

## React Hooks (`.ts` or `.tsx` files)

- **Pattern**: `use-kebab-case.ts`
- **Examples**:
  - `use-mobile.tsx`
  - `use-sse.ts`

## UI Components (shadcn/ui convention)

- **Pattern**: `kebab-case.tsx`
- **Examples**:
  - `alert-dialog.tsx`
  - `dropdown-menu.tsx`
  - `theme-toggle.tsx`

## Providers

- **Pattern**: `kebab-case.tsx` (follows shadcn convention)
- **Examples**:
  - `theme-provider.tsx`

## Utility/Library Files (`.ts` files)

- **Pattern**: `kebab-case.ts`
- **Examples**:
  - `api-client.ts`
  - `time-utils.ts`
  - `route-params.ts`

## Schema/Type Files

- **Pattern**: `kebab-case.ts`
- **Examples**:
  - `devlog.ts`
  - `project.ts`
  - `validation.ts`

## CSS Files

- **Pattern**: `kebab-case.css`
- **Examples**:
  - `globals.css`
  - `base.css`
  - `layout.css`

## API Route Files (Next.js)

- **Pattern**: `route.ts` (Next.js App Router convention)
- **Location**: Within appropriately named directory structures

## Directory Naming

- **Pattern**: `kebab-case` for most directories
- **Examples**:
  - `components/`
  - `contexts/`
  - `schemas/`
  - `hooks/`

## Notes

- Follow existing conventions in the codebase
- UI components use kebab-case to align with shadcn/ui library conventions
- Hooks always start with "use" prefix and use camelCase
- React components use PascalCase
- Utility files use kebab-case for readability
- When in doubt, check existing similar files in the codebase
