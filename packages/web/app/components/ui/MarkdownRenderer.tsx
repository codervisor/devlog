'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { defaultSchema } from 'rehype-sanitize';
import { Typography } from 'antd';
import styles from './MarkdownRenderer.module.css';
import { StickyHeadings } from './StickyHeadings';

// Import highlight.js CSS theme
import 'highlight.js/styles/github.css';

const { Text } = Typography;

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
}

export function MarkdownRenderer({
  content,
  className,
  preserveLineBreaks = true,
  maxHeight = 480, // Default max height
  enableStickyHeadings = false,
  stickyHeadingsTopOffset = 48,
}: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return null;
  }

  // Preprocess content to handle single line breaks
  const processedContent = preserveLineBreaks ? preprocessContent(content) : content;
  const combinedClassName = `${styles.markdownRenderer} ${className || ''}`.trim();
  const wrapperClassName = maxHeight
    ? `${combinedClassName} ${styles.markdownRendererScrollable} thin-scrollbar-vertical`
    : combinedClassName;

  const markdownContent = (
    <div className={wrapperClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          // Temporarily removing sanitization to test
          // [rehypeSanitize, sanitizeSchema]
        ]}
        components={{
          // Use simple div and let CSS handle styling
          p: ({ children }) => <p>{children}</p>,
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h4>{children}</h4>,
          h5: ({ children }) => <h5>{children}</h5>,
          h6: ({ children }) => <h6>{children}</h6>,
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <Text code>{children}</Text>;
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
                <div className={styles.codeBlockWrapper}>
                  <div className={styles.codeBlockHeader}>
                    <span className={styles.codeBlockLanguage}>{language}</span>
                  </div>
                  <pre className={className} {...props}>
                    {children}
                  </pre>
                </div>
              );
            }

            // Fallback to regular pre if no language detected
            return (
              <pre className={className} {...props}>
                {children}
              </pre>
            );
          },
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className={`${styles.tableWrapper} thin-scrollbar-horizontal`}>
              <table>{children}</table>
            </div>
          ),
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
          hr: () => <hr />,
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
          headingSelector=".markdownRenderer h1, .markdownRenderer h2, .markdownRenderer h3, .markdownRenderer h4, .markdownRenderer h5, .markdownRenderer h6"
          topOffset={stickyHeadingsTopOffset}
        />
      </>
    );
  }

  return markdownContent;
}
