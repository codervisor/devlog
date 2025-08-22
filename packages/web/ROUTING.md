# Routing Implementation for @codervisor/devlog-web

## Overview

The web package uses Next.js 14 App Router with hierarchical routing structure that matches the API endpoints. This
provides better organization and clearer URL structure for project-scoped operations.

## Route Structure

### Hierarchical Project-Based Routes (Primary)

```
/                                           - Dashboard (homepage)
/projects                                   - Project management page
/projects/[name]                            - Project details page
/projects/[name]/devlogs                    - List of devlogs for specific project
/projects/[name]/devlogs/[id]               - Individual devlog details within project
```

````markdown
# Routing Implementation for @codervisor/devlog-web

## Overview

The web package uses Next.js 14 App Router with hierarchical routing structure that matches the API endpoints. This
provides better organization and clearer URL structure for project-scoped operations.

## Route Structure

### Hierarchical Project-Based Routes (Primary)

```
/                                           - Redirects to /projects
/projects                                   - Project list page (main entry point)
/projects/[id]                             - Project dashboard/overview page
/projects/[id]/devlogs                     - List of devlogs for specific project
/projects/[id]/devlogs/create              - Create new devlog in specific project
/projects/[id]/devlogs/[devlogId]          - Individual devlog details within project
```

## Key Changes Made

### Route Purpose Updates

- **`/` (Homepage)**: Now redirects to `/projects` as the main entry point
- **`/projects`**: Project list/management page - browse and manage all projects
- **`/projects/[id]`**: Project dashboard - overview with stats, charts, and recent devlogs (formerly the homepage
  dashboard)

### Navigation Flow

1. **User visits `/`** → Automatically redirected to `/projects`
2. **User browses projects** at `/projects` → Can view all projects and create new ones
3. **User selects a project** → Goes to `/projects/[id]` for that project's dashboard
4. **From project dashboard** → Can navigate to devlogs, create entries, etc.

## File Structure

```
app/
├── layout.tsx             - Root layout with AppLayout wrapper
├── page.tsx               - Homepage (redirects to /projects)
├── AppLayout.tsx          - Shared layout with sidebar, header, and navigation
├── projects/
│   ├── page.tsx           - Project list page (/projects) - NEW MAIN ENTRY
│   ├── ProjectManagementPage.tsx - Project list component (updated)
│   └── [id]/
│       ├── page.tsx       - Project dashboard page (/projects/[id])
│       ├── ProjectDetailsPage.tsx - Project dashboard component (now uses Dashboard)
│       └── devlogs/
│           ├── page.tsx   - Project devlog list (/projects/[id]/devlogs)
│           ├── ProjectDevlogListPage.tsx - Project-scoped devlog list
│           ├── create/
│           │   ├── page.tsx - Create devlog in project
│           │   └── ProjectDevlogCreatePage.tsx - Project-scoped create form
│           └── [devlogId]/
│               ├── page.tsx - Dynamic devlog details page
│               └── ProjectDevlogDetailsPage.tsx - Project-scoped details
└── components/
    ├── NavigationSidebar.tsx - Sidebar with project-aware routing
    ├── NavigationBreadcrumb.tsx - Hierarchical breadcrumb navigation
    └── LoadingPage.tsx    - Shared loading component
```

## Component Responsibilities

### ProjectManagementPage (/projects)

- **Primary function**: Project list and management interface
- **Features**: Browse projects, create new projects, view project cards
- **Navigation**: Links to individual project dashboards

### ProjectDetailsPage (/projects/[id])

- **Primary function**: Project-specific dashboard and overview
- **Features**: Project stats, time series charts, recent devlogs, overview stats
- **Context**: Sets project context for the entire project section

### DashboardPage Component

- **Usage**: Embedded in ProjectDetailsPage for project-specific dashboards
- **Features**: Stats visualization, time series data, recent devlogs display
- **Scope**: Project-scoped rather than global

````

## File Structure

```
app/
├── layout.tsx             - Root layout with AppLayout wrapper
├── page.tsx               - Dashboard page (/)
├── AppLayout.tsx          - Shared layout with sidebar, header, and navigation
├── projects/
│   ├── page.tsx           - Project management page (/projects)
│   ├── ProjectManagementPage.tsx - Project management component
│   └── [id]/
│       ├── page.tsx       - Project details page (/projects/[id])
│       ├── ProjectDetailsPage.tsx - Project details component
│       └── devlogs/
│           ├── page.tsx   - Project devlog list (/projects/[id]/devlogs)
│           ├── ProjectDevlogListPage.tsx - Project-scoped devlog list
│           ├── create/
│           │   ├── page.tsx - Create devlog in project
│           │   └── ProjectDevlogCreatePage.tsx - Project-scoped create form
│           └── [devlogId]/
│               ├── page.tsx - Dynamic devlog details page
│               └── ProjectDevlogDetailsPage.tsx - Project-scoped details
└── components/
    ├── NavigationSidebar.tsx - Sidebar with project-aware routing
    ├── NavigationBreadcrumb.tsx - Hierarchical breadcrumb navigation
    └── LoadingPage.tsx    - Shared loading component
```
