# Hierarchy Components

Week 4 MVP Launch - UI components for project hierarchy navigation.

## Components

### HierarchyTree

Displays a collapsible tree view of the project hierarchy:
- Project → Machines → Workspaces → Sessions

**Usage:**
```tsx
import { HierarchyTree } from '@/components/agent-observability/hierarchy';

<HierarchyTree hierarchy={hierarchyData} />
```

**Features:**
- Expand/collapse machines and workspaces
- Display event counts and session counts
- Click sessions to view details
- Responsive design with Tailwind CSS

### HierarchyFilter

Provides cascading filters for project → machine → workspace selection.

**Usage:**
```tsx
import { HierarchyFilter } from '@/components/agent-observability/hierarchy';

<HierarchyFilter className="my-4" />
```

**Features:**
- Auto-load dependent filters (machine when project selected, workspace when machine selected)
- URL state persistence with Next.js router
- Clear filters button
- Loading states

### MachineActivityWidget

Dashboard widget showing activity statistics by machine with bar chart visualization.

**Usage:**
```tsx
import { MachineActivityWidget } from '@/components/agent-observability/widgets';

<MachineActivityWidget projectId={projectId} />
```

**Features:**
- Bar chart with sessions and events
- Interactive tooltips
- Supports project filtering
- Loading and error states

## Pages

### Project Hierarchy Page

Route: `/projects/[name]/hierarchy`

Displays the complete project hierarchy with full navigation.

**Features:**
- Server-side data fetching
- Breadcrumb navigation
- Project metadata display
- Empty state for projects without data

## API Endpoints

### GET /api/stats/machine-activity

Returns aggregated activity statistics by machine.

**Query Parameters:**
- `projectId` (optional): Filter by project

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "hostname": "machine-name",
      "machineType": "local",
      "sessionCount": 10,
      "eventCount": 150,
      "workspaceCount": 3
    }
  ],
  "meta": {
    "timestamp": "2025-10-31T12:00:00.000Z"
  }
}
```

## Types

All hierarchy types are defined in `lib/types/hierarchy.ts`:
- `ProjectHierarchy`
- `MachineWithWorkspaces`
- `WorkspaceWithSessions`
- `HierarchyFilter`

## API Client

Hierarchy API client in `lib/api/hierarchy-api-client.ts`:
- `getProjectHierarchy(projectId)` - Get complete hierarchy
- `listMachines(params)` - List machines with filters
- `getMachine(machineId)` - Get machine details
- `listWorkspaces(params)` - List workspaces with filters
- `getWorkspace(workspaceId)` - Get workspace by ID

## Testing

Basic component tests are in `tests/components/hierarchy/`.

Run tests:
```bash
pnpm test apps/web/tests/components/hierarchy
```

## Implementation Status

✅ HierarchyTree component
✅ HierarchyFilter component with cascading
✅ Project hierarchy page
✅ MachineActivityWidget with chart
✅ Machine activity stats API
✅ Dashboard integration
✅ Navigation links
✅ Basic tests

## Future Enhancements

- [ ] Component unit tests with React Testing Library
- [ ] Integration tests with real data
- [ ] Performance optimization for large hierarchies
- [ ] Workspace heatmap widget
- [ ] Session timeline widget
- [ ] Keyboard navigation support
- [ ] Accessibility improvements
