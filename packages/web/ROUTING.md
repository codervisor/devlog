# Routing Implementation for @codervisor/devlog-web

## Overview

The web package now uses Next.js 14 App Router with proper routing structure instead of the previous single-page client with view state management.

## Route Structure

```
/                           - Dashboard (homepage)
/devlogs                    - List of all devlogs
/devlogs/create             - Create new devlog form
/devlogs/[id]              - Individual devlog details page
```

## File Structure

```
app/
├── layout.tsx             - Root layout with AppLayout wrapper
├── page.tsx               - Dashboard page (/)
├── DashboardPage.tsx      - Dashboard component
├── AppLayout.tsx          - Shared layout with sidebar, header, and navigation
├── devlogs/
│   ├── page.tsx           - Devlog list page (/devlogs)
│   ├── DevlogListPage.tsx - Devlog list component
│   ├── create/
│   │   ├── page.tsx       - Create page (/devlogs/create)
│   │   └── DevlogCreatePage.tsx - Create form component
│   └── [id]/
│       ├── page.tsx       - Dynamic devlog details page
│       └── DevlogDetailsPage.tsx - Details component
└── components/
    ├── NavigationSidebar.tsx - Sidebar with routing-aware navigation
    ├── NavigationBreadcrumb.tsx - Breadcrumb navigation
    └── LoadingPage.tsx    - Shared loading component
```

## Key Features

### 1. Proper Navigation

- Uses Next.js `useRouter` and `usePathname` for navigation
- Sidebar automatically highlights current route
- Breadcrumb navigation shows current location

### 2. Type Safety

- Proper type conversion for DevlogId (string to number)
- TypeScript support throughout routing components

### 3. Shared Layout

- `AppLayout` provides consistent sidebar, header, and error handling
- Global state management for stats and WebSocket connection
- Error boundaries for better error handling

### 4. Loading States

- Dedicated `LoadingPage` component for consistent loading UX
- Proper loading states in data-dependent pages

### 5. Deep Linking

- Direct access to specific devlogs via URL
- Bookmarkable URLs for all pages
- Better SEO support

## Migration from Previous Implementation

The previous implementation used a single `client.tsx` file with view state management:

```tsx
// Old approach
const [currentView, setCurrentView] = useState<View>('dashboard');
const renderCurrentView = () => {
  switch (currentView) {
    case 'dashboard':
      return <Dashboard />;
    // ...
  }
};
```

Now each view is a proper route with its own page component:

```tsx
// New approach
// app/page.tsx - Dashboard
// app/devlogs/page.tsx - List
// app/devlogs/create/page.tsx - Create
// app/devlogs/[id]/page.tsx - Details
```

## Benefits

1. **Better UX**: Users can bookmark, share, and navigate with browser back/forward
2. **SEO**: Each page has its own URL and can be indexed separately
3. **Performance**: Code splitting and route-based loading
4. **Maintainability**: Clear separation of concerns with dedicated page components
5. **Standard Patterns**: Follows Next.js best practices for routing

## Development

To run the development server:

```bash
pnpm --filter @codervisor/devlog-web dev
```

To build for production:

```bash
pnpm --filter @codervisor/devlog-web build
```
