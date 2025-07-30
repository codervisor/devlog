'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { StickyHeadings } from './StickyHeadings';
import { cn } from '@/lib/utils';

// Import highlight.js CSS theme
import 'highlight.js/styles/github.css';

// Custom sanitize schema that allows syntax highlighting attributes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span', // Ensure span is allowed for syntax highlighting
  ],
};

/**
 * Preprocesses markdown content to handle single line breaks from LLMs
 * and escaped newlines from JSON storage
 */
function preprocessContent(content: string): string {
  return (
    content
      // First, handle escaped newlines from JSON storage
      .replace(/\\n/g, '\n')
      // Then protect code blocks from processing
      .replace(/(```[\s\S]*?```)/g, (match) => {
        // Replace newlines in code blocks with a placeholder
        return match.replace(/\n/g, '__CODE_NEWLINE__');
      })
      // Handle single line breaks that aren't already double
      .replace(/(?<![\n\r])\n(?![\n\r])/g, '\n\n')
      // Restore code block newlines
      .replace(/__CODE_NEWLINE__/g, '\n')
      // Clean up any triple+ newlines back to double
      .replace(/\n{3,}/g, '\n\n')
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  preserveLineBreaks?: boolean; // If true, handles escaped newlines and converts single line breaks to paragraphs
  maxHeight?: number | boolean; // Optional max height for the content
  enableStickyHeadings?: boolean; // Enable sticky headings feature
  stickyHeadingsTopOffset?: number; // Top offset for sticky headings
  noPadding?: boolean; // If true, disables padding around the content
}

export function MarkdownRenderer({
  content,
  className,
  preserveLineBreaks = true,
  enableStickyHeadings = false,
  stickyHeadingsTopOffset = 64,
  maxHeight,
  noPadding = false,
}: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return null;
  }

  // Preprocess content to handle single line breaks
  const processedContent = preserveLineBreaks ? preprocessContent(content) : content;

  const wrapperClassName = cn(
    'prose prose-slate max-w-none dark:prose-invert',
    'prose-headings:text-foreground prose-strong:text-foreground',
    'prose-p:text-foreground prose-li:text-foreground',
    'prose-blockquote:text-muted-foreground prose-code:text-foreground',
    'prose-pre:bg-muted prose-pre:text-foreground',
    'prose-th:text-foreground prose-td:text-foreground',
    'prose-a:text-primary hover:prose-a:text-primary/80',
    // Fix list item paragraphs - make them inline and remove margins
    '[&_li>p]:inline [&_li>p]:!m-0 [&_li>p]:!p-0',
    '[&_ul_li>p]:inline [&_ul_li>p]:!m-0 [&_ul_li>p]:!p-0',
    '[&_ol_li>p]:inline [&_ol_li>p]:!m-0 [&_ol_li>p]:!p-0',
    !noPadding && 'p-4',
    maxHeight && 'overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background',
    className,
  );

  const markdownContent = (
    <div
      className={wrapperClassName}
      style={
        maxHeight && typeof maxHeight === 'number' ? { maxHeight: `${maxHeight}px` } : undefined
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={{
          // Use Tailwind-styled components with improved dark mode support
          p: ({ children }) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 mt-8 text-foreground border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-4 mt-6 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-semibold mb-2 mt-3 text-foreground">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold mb-2 mt-3 text-muted-foreground">{children}</h6>
          ),
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              );
            }
            // For code blocks, let ReactMarkdown handle the structure with rehypeHighlight
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, className, ...props }) => {
            // Check if the pre element itself has language information
            let language = '';

            // First, check if pre has className
            if (className) {
              const match = className.match(/language-(\w+)/);
              if (match) {
                language = match[1];
              }
            }

            // If not found on pre, check children
            if (!language) {
              React.Children.forEach(children, (child) => {
                if (React.isValidElement(child) && child.props?.className) {
                  const match = child.props.className.match(/language-(\w+)/);
                  if (match) {
                    language = match[1];
                  }
                }
              });
            }

            if (language) {
              return (
                <div className="relative bg-muted rounded-lg overflow-hidden my-4">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted-foreground/10 border-b border-border">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                      {language}
                    </span>
                  </div>
                  <pre
                    className={cn('overflow-x-auto p-4 text-sm bg-transparent', className)}
                    {...props}
                  >
                    {children}
                  </pre>
                </div>
              );
            }

            // Fallback to regular pre if no language detected
            return (
              <pre
                className={cn('bg-muted rounded p-4 overflow-x-auto text-sm my-4', className)}
                {...props}
              >
                {children}
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-1 my-4 ml-4 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-1 my-4 ml-4 text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => {
            // If the children contains a single paragraph, unwrap it
            if (React.Children.count(children) === 1) {
              const child = React.Children.only(children);
              if (React.isValidElement(child) && child.type === 'p') {
                return (
                  <li className="leading-relaxed text-foreground pl-1">{child.props.children}</li>
                );
              }
            }
            return <li className="leading-relaxed text-foreground pl-1">{children}</li>;
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline transition-colors"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border rounded-lg">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2 text-foreground">{children}</td>
          ),
          hr: () => <hr className="border-t border-border my-6" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );

  if (enableStickyHeadings) {
    return (
      <>
        {markdownContent}
        <StickyHeadings
          headingSelector=".prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6"
          topOffset={stickyHeadingsTopOffset}
        />
      </>
    );
  }

  return markdownContent;
}
