'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import styles from './MarkdownEditor.module.css';
import { configureMonaco } from '../../lib/monaco-config';

// Configure Monaco Editor environment
if (typeof window !== 'undefined') {
  configureMonaco();
}

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  onCancel,
  autoFocus = true,
}: MarkdownEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const currentValueRef = React.useRef(value);

  const handleEditorChange = (newValue: string | undefined) => {
    // Process the value to maintain proper newlines when saving
    const processedNewValue = newValue || '';
    currentValueRef.current = processedNewValue;
    onChange(processedNewValue);
  };

  const handleKeyDown = (e: any) => {
    if (e.keyCode === 9) {
      // Escape key
      e.preventDefault();
      onCancel?.();
    }
  };

  // Preprocess the value to handle escaped newlines properly
  const processedValue = value.replace(/\\n/g, '\n');

  return (
    <div className={styles.markdownEditor} ref={editorRef}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={processedValue}
        onChange={handleEditorChange}
        theme="vs"
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'none',
          fontSize: 14,
          lineHeight: 24,
          padding: { top: 0, bottom: 0 },
          automaticLayout: true,
          contextmenu: false,
          selectOnLineNumbers: false,
          renderLineHighlight: 'none',
          renderWhitespace: 'none',
          renderControlCharacters: false,
          smoothScrolling: false,
          cursorBlinking: 'solid',
          cursorStyle: 'line',
          suggest: {
            showMethods: false,
            showFunctions: false,
            showConstructors: false,
            showFields: false,
            showVariables: false,
            showClasses: false,
            showStructs: false,
            showInterfaces: false,
            showModules: false,
            showProperties: false,
            showEvents: false,
            showOperators: false,
            showUnits: false,
            showValues: false,
            showConstants: false,
            showEnums: false,
            showEnumMembers: false,
            showKeywords: true,
            showWords: true,
            showColors: false,
            showFiles: false,
            showReferences: false,
            showFolders: false,
            showTypeParameters: false,
            showSnippets: true,
          },
          quickSuggestions: {
            other: false,
            comments: false,
            strings: false,
          },
          parameterHints: { enabled: false },
          hover: { enabled: false },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: false,
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            alwaysConsumeMouseWheel: false,
          },
        }}
        onMount={(editor) => {
          // Focus the editor when mounted if autoFocus is enabled
          if (autoFocus) {
            editor.focus();
          }

          // Set up blur handler
          if (onBlur) {
            editor.onDidBlurEditorText(() => {
              onBlur(currentValueRef.current);
            });
          }

          // Handle keyboard events for escape key
          editor.onKeyDown(handleKeyDown);

          function updateHeight() {
            const model = editor.getModel();
            if (!model || !editorRef.current) return;

            // Import monaco dynamically to avoid SSR issues
            import('monaco-editor/esm/vs/editor/editor.api').then((monaco) => {
              const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);

              // Calculate the actual visual line count including wrapped lines
              const actualLineCount = model.getLineCount();
              let visualLineCount = 0;

              for (let i = 1; i <= actualLineCount; i++) {
                const lineLength = model.getLineLength(i);

                // Get the viewport width to calculate wrapping
                const viewportWidth = editor.getLayoutInfo().contentWidth;
                const charWidth = editor.getOption(
                  monaco.editor.EditorOption.fontInfo,
                ).typicalHalfwidthCharacterWidth;
                const maxCharsPerLine = Math.floor(viewportWidth / charWidth);

                if (lineLength === 0) {
                  // Empty line still takes 1 visual line
                  visualLineCount += 1;
                } else if (maxCharsPerLine > 0) {
                  // Calculate wrapped lines for this line
                  visualLineCount += Math.ceil(lineLength / maxCharsPerLine);
                } else {
                  // Fallback to 1 line if we can't calculate wrapping
                  visualLineCount += 1;
                }
              }

              const height = Math.min(visualLineCount * lineHeight, 480);

              // Update the container height directly to avoid re-renders
              if (editorRef.current) {
                editorRef.current.style.height = height + 18 + 'px';
              }
              editor.layout();
            });
          }

          editor.onDidChangeModelContent(updateHeight);

          if (editorRef.current) {
            const resizeObserver = new ResizeObserver(updateHeight);
            resizeObserver.observe(editorRef.current);
          }
        }}
      />
    </div>
  );
}
