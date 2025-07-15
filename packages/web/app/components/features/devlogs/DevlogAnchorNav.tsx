'use client';

import React, { useMemo } from 'react';
import { Anchor } from 'antd';
import { DevlogEntry } from '@devlog/core';
import styles from './DevlogAnchorNav.module.css';

interface DevlogAnchorNavProps {
  devlog: DevlogEntry;
}

export function DevlogAnchorNav({ devlog }: DevlogAnchorNavProps) {
  const anchorItems = useMemo(() => {
    const items = [];

    // Description - always present
    items.push({
      key: 'description',
      href: '#description',
      title: 'Description',
    });

    // Business Context
    if (devlog.context?.businessContext) {
      items.push({
        key: 'business-context',
        href: '#business-context',
        title: 'Business Context',
      });
    }

    // Technical Context
    if (devlog.context?.technicalContext) {
      items.push({
        key: 'technical-context',
        href: '#technical-context',
        title: 'Technical Context',
      });
    }

    // Acceptance Criteria
    if (devlog.context?.acceptanceCriteria && devlog.context.acceptanceCriteria.length > 0) {
      items.push({
        key: 'acceptance-criteria',
        href: '#acceptance-criteria',
        title: 'Acceptance Criteria',
      });
    }

    // Dependencies
    if (devlog.context?.dependencies && devlog.context.dependencies.length > 0) {
      items.push({
        key: 'dependencies',
        href: '#dependencies',
        title: 'Dependencies',
      });
    }

    // Decisions
    if (devlog.context?.decisions && devlog.context.decisions.length > 0) {
      items.push({
        key: 'decisions',
        href: '#decisions',
        title: 'Decisions',
      });
    }

    // Risks
    if (devlog.context?.risks && devlog.context.risks.length > 0) {
      items.push({
        key: 'risks',
        href: '#risks',
        title: 'Risks',
      });
    }

    // Related Files
    if (devlog.files && devlog.files.length > 0) {
      items.push({
        key: 'files',
        href: '#files',
        title: 'Related Files',
      });
    }

    // Related Devlogs
    if (devlog.relatedDevlogs && devlog.relatedDevlogs.length > 0) {
      items.push({
        key: 'related-devlogs',
        href: '#related-devlogs',
        title: 'Related Devlogs',
      });
    }

    // AI Context
    if (
      devlog.aiContext &&
      (devlog.aiContext.currentSummary ||
        (devlog.aiContext.keyInsights && devlog.aiContext.keyInsights.length > 0) ||
        (devlog.aiContext.openQuestions && devlog.aiContext.openQuestions.length > 0) ||
        (devlog.aiContext.suggestedNextSteps && devlog.aiContext.suggestedNextSteps.length > 0) ||
        (devlog.aiContext.relatedPatterns && devlog.aiContext.relatedPatterns.length > 0))
    ) {
      items.push({
        key: 'ai-context',
        href: '#ai-context',
        title: 'AI Context',
      });
    }

    // External References
    if (devlog.externalReferences && devlog.externalReferences.length > 0) {
      items.push({
        key: 'external-references',
        href: '#external-references',
        title: 'External References',
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

  // Don't render if there are too few sections to navigate
  if (anchorItems.length <= 2) {
    return null;
  }

  return (
    <Anchor
      className={styles.anchorNav}
      getContainer={() => document.querySelector('.page-content.scrollable-content') as HTMLElement}
      items={anchorItems}
      offsetTop={120} // Account for sticky header height
      bounds={20}
      targetOffset={120}
    />
  );
}
