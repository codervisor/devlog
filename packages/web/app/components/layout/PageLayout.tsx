'use client';

import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  /**
   * Actions to display in the page header (like buttons, etc.)
   */
  actions?: React.ReactNode;
  /**
   * Custom header content that replaces the entire header area
   */
  headerContent?: React.ReactNode;
  /**
   * Additional CSS class for the page layout container
   */
  className?: string;
  /**
   * Whether to use sticky header behavior (true by default)
   */
  stickyHeader?: boolean;
}

export function PageLayout({
  children,
  actions,
  headerContent,
  className = '',
  stickyHeader = true,
}: PageLayoutProps) {
  // If headerContent is provided, use it completely
  if (headerContent) {
    return (
      <div className={`page-layout scrollable-content ${className}`}>
        <div className={stickyHeader ? 'page-header-sticky' : 'page-header'}>{headerContent}</div>
        <div className="page-content scrollable-content">{children}</div>
      </div>
    );
  }

  // If actions are provided, show a simple header with actions
  if (actions) {
    return (
      <div className={`page-layout scrollable-content ${className}`}>
        <div className={stickyHeader ? 'page-header-sticky' : 'page-header'}>
          <div className="page-header-content">
            <div className="page-header-right">{actions}</div>
          </div>
        </div>
        <div className="page-content scrollable-content">{children}</div>
      </div>
    );
  }

  // Default layout with just content (no header)
  return (
    <div className={`page-layout scrollable-content ${className}`}>
      <div className="page-content scrollable-content">{children}</div>
    </div>
  );
}
