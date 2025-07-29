'use client';

import React, { useEffect, useRef } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';

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
  placeholder,
  autoFocus = true,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const currentValueRef = useRef(value);

  // Update current value ref when value changes
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (evn: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = evn.target.value;
    currentValueRef.current = newValue;
    onChange(newValue);
  };

  const handleBlur = () => {
    onBlur?.(currentValueRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  // Preprocess the value to handle escaped newlines properly
  const processedValue = value.replace(/\\n/g, '\n');

  return (
    <div className="w-full rounded-md overflow-hidden bg-white [&_.w-tc-editor]:!p-4 [&_.w-tc-editor_.w-tc-editor-text]:!p-0 [&_.w-tc-editor_.w-tc-editor-text]:!bg-transparent [&_.w-tc-editor_.w-tc-editor-text]:!text-sm [&_.w-tc-editor_.w-tc-editor-preview]:!p-0 [&_.w-tc-editor_.w-tc-editor-preview]:!text-sm">
      <CodeEditor
        ref={editorRef}
        value={processedValue}
        language="markdown"
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        padding={12}
        data-color-mode="light"
      />
    </div>
  );
}
