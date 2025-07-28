'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styles from './StickyHeadings.module.css';

interface HeadingInfo {
  id: string;
  text: string;
  level: number;
  element: Element;
  top: number;
}

interface StickyHeadingsProps {
  /**
   * The container element to watch for scrolling (defaults to document)
   */
  scrollContainer?: HTMLElement | null;
  /**
   * CSS selector to find headings (defaults to 'h1, h2, h3, h4, h5, h6')
   */
  headingSelector?: string;
  /**
   * Whether the component is enabled
   */
  enabled?: boolean;
  /**
   * Additional CSS class for the sticky container
   */
  className?: string;
  /**
   * Offset from top where sticky headers should appear
   */
  topOffset?: number;
}

export function StickyHeadings({
  scrollContainer,
  headingSelector = 'h1, h2, h3, h4, h5, h6',
  enabled = true,
  className = '',
  topOffset = 0,
}: StickyHeadingsProps) {
  const [headings, setHeadings] = useState<HeadingInfo[]>([]);
  const [activeHeadings, setActiveHeadings] = useState<HeadingInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract text content from heading element, handling React nodes
  const extractTextContent = useCallback((element: Element): string => {
    // Try to get text content directly first
    let text = element.textContent || '';
    
    // If empty, try to get from data attributes that might be set by React
    if (!text) {
      text = element.getAttribute('title') || element.getAttribute('aria-label') || '';
    }
    
    return text.trim();
  }, []);

  // Generate or get ID for heading element
  const getHeadingId = useCallback((element: Element, index: number): string => {
    // Check if element already has an ID
    if (element.id) {
      return element.id;
    }
    
    // Generate ID from text content
    const text = extractTextContent(element);
    const baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    
    const id = baseId || `heading-${index}`;
    
    // Set the ID on the element for future reference
    element.id = id;
    
    return id;
  }, [extractTextContent]);

  // Discover headings in the document
  const discoverHeadings = useCallback(() => {
    if (!enabled) {
      setHeadings([]);
      return;
    }

    const container = scrollContainer || document;
    const headingElements = container.querySelectorAll(headingSelector);
    
    const discoveredHeadings: HeadingInfo[] = Array.from(headingElements).map((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.charAt(1), 10);
      const text = extractTextContent(element);
      const id = getHeadingId(element, index);
      
      return {
        id,
        text,
        level,
        element,
        top: 0, // Will be updated by intersection observer
      };
    });

    setHeadings(discoveredHeadings);
  }, [enabled, scrollContainer, headingSelector, extractTextContent, getHeadingId]);

  // Update active headings based on scroll position
  const updateActiveHeadings = useCallback((visibleHeadings: Set<string>) => {
    if (headings.length === 0) {
      setActiveHeadings([]);
      setIsVisible(false);
      return;
    }

    // Find the currently active heading (last visible heading)
    let activeHeading: HeadingInfo | null = null;
    
    // Go through headings in document order to find the last visible one
    for (const heading of headings) {
      if (visibleHeadings.has(heading.id)) {
        activeHeading = heading;
      }
    }

    if (!activeHeading) {
      setActiveHeadings([]);
      setIsVisible(false);
      return;
    }

    // Build hierarchy: collect all parent headings
    const hierarchy: HeadingInfo[] = [];
    
    // Find all parent headings (headings with lower level numbers that come before this one)
    const activeIndex = headings.findIndex(h => h.id === activeHeading!.id);
    
    for (let i = activeIndex - 1; i >= 0; i--) {
      const heading = headings[i];
      if (heading.level < activeHeading!.level) {
        // This is a parent heading
        hierarchy.unshift(heading);
        // Update active heading to continue looking for its parents
        activeHeading = heading;
      }
    }
    
    // Add the original active heading back
    const originalActive = headings[activeIndex];
    if (!hierarchy.find(h => h.id === originalActive.id)) {
      hierarchy.push(originalActive);
    }

    setActiveHeadings(hierarchy);
    setIsVisible(hierarchy.length > 0);
  }, [headings]);

  // Set up intersection observer to track heading visibility
  useEffect(() => {
    if (!enabled || headings.length === 0) {
      return;
    }

    const visibleHeadings = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const headingId = entry.target.id;
          if (entry.isIntersecting) {
            visibleHeadings.add(headingId);
          } else {
            visibleHeadings.delete(headingId);
          }
        });
        
        updateActiveHeadings(visibleHeadings);
      },
      {
        root: scrollContainer,
        rootMargin: `-${topOffset}px 0px -50% 0px`, // Trigger when heading is at the top
        threshold: 0,
      }
    );

    // Observe all heading elements
    headings.forEach((heading) => {
      if (heading.element) {
        observerRef.current!.observe(heading.element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, headings, scrollContainer, topOffset, updateActiveHeadings]);

  // Discover headings when component mounts or dependencies change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(discoverHeadings, 100);
    return () => clearTimeout(timer);
  }, [discoverHeadings]);

  // Re-discover headings when DOM changes (for dynamic content)
  useEffect(() => {
    if (!enabled) return;

    const observer = new MutationObserver(() => {
      // Debounce the discovery to avoid too many updates
      const timer = setTimeout(discoverHeadings, 300);
      return () => clearTimeout(timer);
    });

    const container = scrollContainer || document.body;
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [enabled, scrollContainer, discoverHeadings]);

  // Handle clicking on sticky heading to scroll to original
  const handleHeadingClick = useCallback((headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  // Get CSS class for top offset
  const getTopOffsetClass = useCallback((offset: number): string => {
    if (offset <= 0) return styles.topOffset0;
    if (offset <= 48) return styles.topOffset48;
    if (offset <= 64) return styles.topOffset64;
    return styles.topOffset80;
  }, []);

  if (!enabled || !isVisible || activeHeadings.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.stickyHeadings} ${getTopOffsetClass(topOffset)} ${className}`}
    >
      {activeHeadings.map((heading, index) => (
        <div
          key={heading.id}
          className={`${styles.stickyHeading} ${styles[`level${heading.level}`]}`}
          onClick={() => handleHeadingClick(heading.id)}
          role="button"
          tabIndex={0}
          aria-label={`Go to ${heading.text}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleHeadingClick(heading.id);
            }
          }}
        >
          <span className={styles.headingText}>{heading.text}</span>
          <span className={styles.headingLevel}>H{heading.level}</span>
        </div>
      ))}
    </div>
  );
}
