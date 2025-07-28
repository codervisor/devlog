# Routing Implementation for @codervisor/devlog-web

## Overview

The web package uses Next.js 14 App Router with hierarchical routing structure that matches the API endpoints. This provides better organization and clearer URL structure for project-scoped operations.

## Route Structure

### Hierarchical Project-Based Routes (Primary)
```
/                                           - Dashboard (homepage)
/projects                                   - Project management page
/projects/[id]                             - Project details page
/projects/[id]/devlogs                     - List of devlogs for specific project
/projects/[id]/devlogs/create              - Create new devlog in specific project
/projects/[id]/devlogs/[devlogId]          - Individual devlog details within project
```

# Routing Implementation for @codervisor/devlog-web

## Overview

The web package uses Next.js 14 App Router with hierarchical routing structure that matches the API endpoints. This provides better organization and clearer URL structure for project-scoped operations.

## Route Structure

### Hierarchical Project-Based Routes
```
/                                           - Dashboard (homepage)
/projects                                   - Project management page
/projects/[id]                             - Project details page
/projects/[id]/devlogs                     - List of devlogs for specific project
/projects/[id]/devlogs/create              - Create new devlog in specific project
/projects/[id]/devlogs/[devlogId]          - Individual devlog details within project
```

## File Structure

```
app/
├── layout.tsx             - Root layout with AppLayout wrapper
├── page.tsx               - Dashboard page (/)
├── DashboardPage.tsx      - Dashboard component
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
