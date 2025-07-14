'use client';

import React from 'react';
import { NavigationBreadcrumb } from './NavigationBreadcrumb';

interface PageLayoutProps {
  children: React.ReactNode;
  /**
   * Custom breadcrumb element to replace the default NavigationBreadcrumb
   */
  breadcrumb?: React.ReactNode;
  /**
   * Actions to display on the right side of the breadcrumb area
   */
  actions?: React.ReactNode;
  /**
   * Custom header content that replaces the entire breadcrumb area
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
  breadcrumb,
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

  // Default layout with breadcrumb and/or actions
  return (
    <div className={`page-layout scrollable-content ${className}`}>
      <div className={stickyHeader ? 'page-header-sticky' : 'page-header'}>
        <div className="page-header-content">
          <div className="page-header-left">
            {breadcrumb || <NavigationBreadcrumb />}
          </div>
          {actions && <div className="page-header-right">{actions}</div>}
        </div>
      </div>
      <div className="page-content scrollable-content">{children}</div>
    </div>
  );
}
