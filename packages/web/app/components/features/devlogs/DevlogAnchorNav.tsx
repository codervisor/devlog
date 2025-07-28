import React from 'react';
import { Anchor } from 'antd';
import { DevlogEntry } from '@codervisor/devlog-core';

interface DevlogAnchorNavProps {
  devlog: DevlogEntry;
}

export function DevlogAnchorNav({ devlog }: DevlogAnchorNavProps) {
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

    // Notes
    if (devlog.notes && devlog.notes.length > 0) {
      items.push({
        key: 'notes',
        href: '#notes',
        title: 'Notes',
      });
    }

    return items;
  }, [devlog]);

  if (items.length <= 1) {
    return null; // Don't show anchor nav if only description exists
  }

  return (
    <div style={{ position: 'sticky', top: 20 }}>
      <Anchor
        direction="vertical"
        items={items}
        affix={false}
        onClick={(e, link) => {
          e.preventDefault();
          // Scroll to the target element
          const targetId = link.href.replace('#', '');
          const element = document.getElementById(targetId);
          if (element) {
            const offsetTop = element.offsetTop - 80; // Account for fixed header
            window.scrollTo({
              top: offsetTop,
              behavior: 'smooth',
            });
          }
        }}
      />
    </div>
  );
}
