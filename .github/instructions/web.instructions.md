---
applyTo: 'packages/web/**/*.{ts,tsx,js,jsx}'
---

# Web Application Development Guidelines

## 📦 Import System for Next.js

### Next.js Import Patterns
- **App directory imports**: Use `@/` aliases for app/* directory structure
- **Component imports**: Use relative paths for component organization
- **Cross-package imports**: Use `@devlog/*` for core/mcp/ai packages
- **External libraries**: Standard npm package imports

### Web-Specific Import Examples
```typescript
// ✅ Next.js app directory (@ aliases work here)
import { DevlogCard } from '@/components/devlog/devlog-card';
import { Button } from '@/components/ui/button';
import { getDevlogs } from '@/lib/api';

// ✅ Relative component imports
import { DevlogList } from './devlog-list';
import { StatusBadge } from '../ui/status-badge';

// ✅ Cross-package imports (no .js needed in Next.js)
import { DevlogManager } from '@devlog/core';
import { ChatParser } from '@devlog/ai';

// ✅ External libraries
import { clsx } from 'clsx';
import Link from 'next/link';
```

### Why Different Rules for Web Package
- **Next.js bundler**: Handles module resolution differently than Node.js
- **Webpack compatibility**: No .js extensions needed for internal imports
- **App directory**: @ aliases are properly configured for app/* structure
- **Build process**: Next.js handles TypeScript compilation and bundling

## ⚛️ Next.js App Router Architecture

### **⚠️ AUTOMATIC MIGRATION DETECTION**
**When editing Web package files, auto-detect core dependency changes:**

#### **Implicit Migration Triggers**
- **Import errors from @devlog/core** → Core API likely changed
- **Type errors in API routes** → Core types may have been updated
- **Context provider errors** → Core manager interfaces changed
- **SSE event issues** → Core event system updated

#### **Auto-Check Before Web Changes**
```bash
# Check if core types are still compatible:
pnpm --filter @devlog/web build:test

# Search for core imports that might be affected:
grep -r "@devlog/core" packages/web/app/ --include="*.ts" --include="*.tsx"
```

### **Migration Awareness for Web Package**
⚠️ **When @devlog/core architecture changes:**
1. **Update API routes** in `app/api/` directory
2. **Update React contexts** for new manager/service patterns
3. **Update component integration** with core types and methods
4. **Verify SSE events** and real-time features work with changes
5. **Test user workflows** end-to-end after core updates

### **Common Migration Points:**
- **Manager class changes** → Update contexts, API routes, service layer
- **Core API changes** → Update data fetching and state management
- **Type/interface changes** → Update component props and API responses
- **Storage provider changes** → Update API endpoints and configuration

### Directory Structure Standards
```
app/
├── globals.css           # Global styles only
├── layout.tsx           # Root layout with providers
├── page.tsx             # Home page component
├── loading.tsx          # Global loading UI
├── error.tsx            # Global error UI
├── not-found.tsx        # 404 page
└── {route}/
    ├── page.tsx         # Route page component
    ├── layout.tsx       # Route-specific layout
    ├── loading.tsx      # Route loading UI
    └── error.tsx        # Route error boundary
```

### Component Organization
```
components/
├── ui/                  # Reusable UI components
│   ├── button.tsx      # Base button component
│   ├── card.tsx        # Card layout component
│   └── index.ts        # UI component exports
├── features/           # Feature-specific components
│   ├── devlog/         # Devlog-related components
│   ├── auth/           # Authentication components
│   └── dashboard/      # Dashboard components
└── providers/          # Context providers and wrappers
    ├── theme-provider.tsx
    └── query-provider.tsx
```

## 🎨 Styling Standards

### Tailwind CSS Guidelines
- **Use utility classes** for styling components
- **Create component variants** using class utility functions
- **Define custom design tokens** in tailwind.config.js
- **Use CSS variables** for dynamic theming

### Component Styling Patterns
```tsx
// Use cn() utility for conditional classes
const buttonVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
  },
};

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Responsive Design
- **Mobile-first approach** using Tailwind breakpoints
- **Use responsive utilities** (sm:, md:, lg:, xl:)
- **Test on multiple screen sizes** during development
- **Optimize for touch interfaces** on mobile devices

## 📱 Component Development

### React Component Patterns
```tsx
// Functional component template
interface ComponentProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export function Component({ 
  title, 
  children, 
  className,
  variant = 'default',
  ...props 
}: ComponentProps) {
  return (
    <div className={cn('base-styles', className)} {...props}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
```

### State Management
- **Use useState** for local component state
- **Use useReducer** for complex state logic
- **Use React Query** for server state management
- **Use Context** sparingly for global app state

### Custom Hooks Patterns
```tsx
// Custom hook template
export function useDevlogEntry(id: number) {
  const [data, setData] = useState<DevlogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const entry = await api.getDevlogEntry(id);
        setData(entry);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id]);
  
  return { data, loading, error };
}
```

## 🔄 Data Fetching & State

### Server Components vs Client Components
- **Use Server Components** by default for data fetching
- **Use Client Components** for interactivity and browser APIs
- **Mark Client Components** with 'use client' directive
- **Minimize client bundle size** by keeping Server Components when possible

### Data Fetching Patterns
```tsx
// Server Component data fetching
async function DevlogList() {
  const devlogs = await fetch('/api/devlogs').then(res => res.json());
  
  return (
    <div className="space-y-4">
      {devlogs.map((devlog) => (
        <DevlogCard key={devlog.id} devlog={devlog} />
      ))}
    </div>
  );
}

// Client Component with React Query
'use client';
function InteractiveDevlogList() {
  const { data: devlogs, isLoading, error } = useQuery({
    queryKey: ['devlogs'],
    queryFn: () => api.getDevlogs(),
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="space-y-4">
      {devlogs?.map((devlog) => (
        <DevlogCard key={devlog.id} devlog={devlog} />
      ))}
    </div>
  );
}
```

## 🛣️ Routing & Navigation

### App Router Conventions
- **Use folder-based routing** with page.tsx files
- **Implement loading states** with loading.tsx
- **Handle errors** with error.tsx boundaries
- **Use layout.tsx** for shared UI elements

### Navigation Patterns
```tsx
// Use Next.js Link component for navigation
import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="flex space-x-4">
      <Link 
        href="/devlogs" 
        className="text-foreground hover:text-primary"
      >
        Devlogs
      </Link>
      <Link 
        href="/dashboard" 
        className="text-foreground hover:text-primary"
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

### Dynamic Routes
- **Use [param] folders** for dynamic segments
- **Use [...param] folders** for catch-all routes
- **Access params** via params prop in page components
- **Handle route validation** and 404 cases

## 🎯 Performance Optimization

### Bundle Optimization
- **Use dynamic imports** for code splitting
- **Implement lazy loading** for heavy components
- **Optimize images** with Next.js Image component
- **Tree shake unused imports** and dependencies

### Rendering Optimization
```tsx
// Memoize expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  const processedData = useMemo(() => {
    return expensiveComputation(data);
  }, [data]);
  
  return <div>{processedData}</div>;
});

// Use callback optimization
const Parent = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  return <Child onClick={handleClick} />;
};
```

### Image and Asset Optimization
- **Use next/image** for all images
- **Provide alt text** for accessibility
- **Use appropriate image formats** (WebP, AVIF when supported)
- **Implement responsive images** with sizes prop

## 🧪 Testing Standards

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevlogCard } from './devlog-card';

describe('DevlogCard', () => {
  const mockDevlog = {
    id: 1,
    title: 'Test Devlog',
    type: 'feature',
    status: 'new',
  };
  
  it('should render devlog information', () => {
    render(<DevlogCard devlog={mockDevlog} />);
    
    expect(screen.getByText('Test Devlog')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });
  
  it('should handle click events', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    
    render(<DevlogCard devlog={mockDevlog} onClick={mockOnClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith(mockDevlog);
  });
});
```

### Integration Testing
- **Test user workflows** end-to-end
- **Mock API responses** appropriately
- **Test error states** and edge cases
- **Verify accessibility** with screen readers

## 🎨 Design System Integration

### Component Variants
```tsx
// Use cva (class-variance-authority) for variants
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      variant: {
        default: 'border-border',
        outlined: 'border-2 border-primary',
        elevated: 'shadow-lg',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

interface CardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, size, variant, children }: CardProps) {
  return (
    <div className={cn(cardVariants({ size, variant }), className)}>
      {children}
    </div>
  );
}
```

### Dark Mode Support
- **Use CSS variables** for theme colors
- **Implement theme toggle** functionality
- **Test in both light and dark** modes
- **Respect user system preferences**

## 🚨 Critical Requirements

### MUST DO
- ✅ Use TypeScript for all components and pages
- ✅ Implement proper error boundaries and loading states
- ✅ Follow Next.js App Router conventions
- ✅ Use Tailwind CSS for styling consistently
- ✅ Optimize for performance and accessibility

### MUST NOT DO
- ❌ Use inline styles instead of Tailwind classes
- ❌ Create client components unnecessarily
- ❌ Ignore accessibility best practices
- ❌ Skip error handling in data fetching
- ❌ Use deprecated Next.js patterns (Pages Router)

## 🎯 Quality Standards

### Accessibility (a11y)
- **Semantic HTML** elements and proper heading hierarchy
- **ARIA attributes** for complex interactions
- **Keyboard navigation** support for all interactive elements
- **Screen reader compatibility** with proper labels
- **Color contrast** meeting WCAG guidelines

### Performance Metrics
- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### SEO Optimization
- **Meta tags** for all pages using Next.js metadata API
- **Structured data** where appropriate
- **Proper URL structure** with meaningful slugs
- **XML sitemap** generation for better indexing
