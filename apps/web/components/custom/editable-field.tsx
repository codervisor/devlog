'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2 } from 'lucide-react';
import { MarkdownEditor } from './markdown-editor';
import { cn } from '@/lib';

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  type?: 'text' | 'select' | 'textarea' | 'markdown';
  options?: { label: string; value: string }[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  draftMode?: boolean; // When true, doesn't auto-save on blur
  borderless?: boolean; // Use borderless style for input
  children: React.ReactNode;
}

export function EditableField({
  value,
  onSave,
  multiline = false,
  type = 'text',
  options = [],
  placeholder,
  emptyText,
  className,
  size = 'sm',
  draftMode = true,
  borderless = true,
  children,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) {
        inputRef.current.focus();
      } else if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleBlurWithValue(editValue);
  };

  const handleBlurWithValue = (currentValue: string) => {
    if (draftMode) {
      // In draft mode, just save the local value and exit edit mode
      // The parent component will handle when to actually save
      if (currentValue !== value) {
        onSave(currentValue);
      }
      setIsEditing(false);
    } else {
      // Original behavior: save changes when losing focus
      handleSave();
    }
  };

  const handleEnterEdit = () => {
    setIsEditing(true);
  };

  const renderInput = () => {
    if (type === 'markdown') {
      return (
        <MarkdownEditor
          value={editValue || ''}
          onChange={(value) => {
            setEditValue(value);
          }}
          onBlur={handleBlurWithValue}
          onCancel={handleCancel}
          placeholder={placeholder}
          autoFocus={true}
        />
      );
    }

    if (type === 'select') {
      return (
        <Select
          value={editValue}
          onValueChange={(newValue) => {
            setEditValue(newValue);
            if (draftMode) {
              if (newValue !== value) {
                onSave(newValue);
              }
              setIsEditing(false);
            }
          }}
          open={isEditing}
          onOpenChange={setIsEditing}
        >
          <SelectTrigger
            className={cn(
              'w-full',
              borderless && 'border-none shadow-none bg-transparent',
              size === 'sm' && 'h-8',
              size === 'lg' && 'h-12',
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (type === 'textarea' || multiline) {
      return (
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'min-h-[32px] resize-none',
            borderless && 'border-none shadow-none bg-transparent focus-visible:ring-0',
          )}
        />
      );
    } else {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            borderless && 'border-none shadow-none bg-transparent focus-visible:ring-0',
            size === 'sm' && 'h-8',
            size === 'lg' && 'h-12',
          )}
        />
      );
    }
  };

  const renderContent = () => {
    if (showEmptyText && (!value || value.trim() === '')) {
      return <span className="text-muted-foreground italic">{emptyText}</span>;
    }

    return children;
  };

  if (isEditing) {
    return <div className={cn('relative', className)}>{renderInput()}</div>;
  }

  // Show empty text if value is empty and emptyText is provided
  const showEmptyText = (!value || value.trim() === '') && emptyText;

  return (
    <div
      ref={contentRef}
      className={cn(
        'relative cursor-pointer group hover:bg-muted/20 rounded transition-colors',
        borderless && 'border-none',
        className,
      )}
      onClick={handleEnterEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Click to edit"
    >
      {renderContent()}
      <div
        className={cn(
          'absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-background/80 rounded p-1',
        )}
      >
        <Edit2 className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
