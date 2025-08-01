import { useEffect, useRef } from 'react';

interface UseStickyHeadersOptions {
  /**
   * CSS class selector for elements that should have sticky detection
   */
  selectorClass: string;

  /**
   * CSS class to add when element becomes sticky
   */
  stickyClass: string;

  /**
   * Offset from top in pixels to account for other sticky elements (e.g., main header)
   * @default 0
   */
  topOffset?: number;

  /**
   * Dependencies that should trigger re-initialization of observers
   */
  dependencies?: React.DependencyList;

  /**
   * Delay in milliseconds before setting up observers (to ensure DOM is ready)
   * @default 100
   */
  setupDelay?: number;
}

/**
 * Custom hook that automatically detects when elements with a specific CSS class
 * become sticky and adds/removes a CSS class accordingly.
 *
 * This hook uses the "sentinel element" technique with IntersectionObserver
 * to reliably detect sticky state changes.
 *
 * @example
 * ```tsx
 * // In your component
 * useStickyHeaders({
 *   selectorClass: styles.sectionHeader,
 *   stickyClass: styles.isSticky,
 *   topOffset: 120, // Account for main header
 *   dependencies: [data.id] // Re-run when data changes
 * });
 * ```
 */
export function useStickyHeaders({
  selectorClass,
  stickyClass,
  topOffset = 0,
  dependencies = [],
  setupDelay = 100,
}: UseStickyHeadersOptions) {
  const observersRef = useRef<IntersectionObserver[]>([]);
  const sentinelsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    // Cleanup function to remove observers and sentinels
    const cleanup = () => {
      // Disconnect all observers
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current = [];

      // Remove all sentinel elements
      sentinelsRef.current.forEach((sentinel) => {
        if (sentinel.parentNode) {
          sentinel.parentNode.removeChild(sentinel);
        }
      });
      sentinelsRef.current = [];
    };

    // Setup function to create observers
    const setupObservers = () => {
      // Find all elements that should have sticky detection
      const targetElements = document.querySelectorAll(`.${selectorClass}`);

      targetElements.forEach((element) => {
        const htmlElement = element as HTMLElement;

        // Create a sentinel element above each target element
        const sentinel = document.createElement('div');
        sentinel.style.cssText = `
          position: absolute;
          top: -1px;
          height: 1px;
          width: 1px;
          pointer-events: none;
          visibility: hidden;
          z-index: -1;
        `;

        // Add a data attribute to help with cleanup
        sentinel.setAttribute('data-sticky-sentinel', 'true');

        // Insert sentinel before the target element
        if (htmlElement.parentNode) {
          htmlElement.parentNode.insertBefore(sentinel, htmlElement);
          sentinelsRef.current.push(sentinel);
        }

        // Create an observer for the sentinel
        const observer = new IntersectionObserver(
          ([entry]) => {
            // When sentinel is not visible, the target element is sticky
            const isSticky = !entry.isIntersecting;

            if (isSticky) {
              htmlElement.classList.add(stickyClass);
            } else {
              htmlElement.classList.remove(stickyClass);
            }
          },
          {
            threshold: [0],
            rootMargin: topOffset > 0 ? `-${topOffset}px 0px 0px 0px` : '0px',
          },
        );

        observer.observe(sentinel);
        observersRef.current.push(observer);
      });
    };

    // Setup observers after a delay to ensure DOM is ready
    const timeoutId = setTimeout(setupObservers, setupDelay);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Also cleanup on unmount
  useEffect(() => {
    return () => {
      // Final cleanup when component unmounts
      observersRef.current.forEach((observer) => observer.disconnect());
      sentinelsRef.current.forEach((sentinel) => {
        if (sentinel.parentNode) {
          sentinel.parentNode.removeChild(sentinel);
        }
      });
    };
  }, []);
}
