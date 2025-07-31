import React from 'react';
import { DevlogEntry } from '@codervisor/devlog-core';
import { cn } from '@/lib';

interface DevlogAnchorNavProps {
  devlog: DevlogEntry;
  notesCount?: number;
}

export function DevlogAnchorNav({ devlog, notesCount }: DevlogAnchorNavProps) {
  const [activeSection, setActiveSection] = React.useState('description');

  const items = React.useMemo(() => {
    const items: { key: string; href: string; title: string }[] = [];

    // Description (always present)
    items.push({
      key: 'description',
      href: '#description',
      title: 'Description',
    });

    // Business Context
    if (devlog.businessContext) {
      items.push({
        key: 'business-context',
        href: '#business-context',
        title: 'Business Context',
      });
    }

    // Technical Context
    if (devlog.technicalContext) {
      items.push({
        key: 'technical-context',
        href: '#technical-context',
        title: 'Technical Context',
      });
    }

    // Acceptance Criteria
    if (devlog.acceptanceCriteria && devlog.acceptanceCriteria.length > 0) {
      items.push({
        key: 'acceptance-criteria',
        href: '#acceptance-criteria',
        title: 'Acceptance Criteria',
      });
    }

    // Dependencies
    if (devlog.dependencies && devlog.dependencies.length > 0) {
      items.push({
        key: 'dependencies',
        href: '#dependencies',
        title: 'Dependencies',
      });
    }

    // Notes - always show the notes section now since notes are loaded separately
    items.push({
      key: 'notes',
      href: '#notes',
      title: `Notes${notesCount !== undefined ? ` (${notesCount})` : ''}`,
    });

    return items;
  }, [devlog]);

  // Set up intersection observer to track active section
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-176px 0px -50% 0px', // Account for fixed header (increased from -80px)
        threshold: 0.1,
      },
    );

    items.forEach(({ key }) => {
      const element = document.getElementById(key);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length <= 1) {
    return null; // Don't show anchor nav if only description exists
  }

  const handleClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      const offsetTop = element.offsetTop - 176; // Account for fixed header (increased from 80)
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="sticky top-5">
      <nav className="space-y-1">
        <div className="relative">
          {/* Active indicator line */}
          <div className="absolute left-0 top-0 w-0.5 bg-border h-full" />
          <div
            className="absolute left-0 w-0.5 bg-primary transition-all duration-200 ease-in-out"
            style={{
              top: `${items.findIndex((item) => item.key === activeSection) * 2}rem`,
              height: '1.5rem',
            }}
          />

          {/* Navigation items */}
          <div className="pl-4 space-y-1">
            {items.map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                className={cn(
                  'block py-1 text-sm leading-6 transition-colors hover:text-foreground',
                  activeSection === item.key ? 'text-primary font-medium' : 'text-muted-foreground',
                )}
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
