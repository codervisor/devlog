'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Briefcase,
  CheckCircle,
  ChevronRight,
  FileText,
  MessageSquare,
  Network,
  Wrench,
} from 'lucide-react';
import { DevlogEntry, DevlogNote, NoteCategory } from '@codervisor/devlog-core';
import { EditableField } from '@/components/custom/EditableField';
import { MarkdownRenderer } from '@/components/custom/MarkdownRenderer';
import {
  cn,
  formatTimeAgoWithTooltip,
  getCategoryIconRaw,
  priorityOptions,
  statusOptions,
  typeOptions,
} from '@/lib';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag } from '@/components';
import { useStickyHeaders } from '@/hooks/use-sticky-headers';
import { DevlogAnchorNav } from './DevlogAnchorNav';
import { DataContext } from '@/stores/base';

interface DevlogDetailsProps {
  devlogContext: DataContext<DevlogEntry>;
  notesContext: DataContext<DevlogNote[]>;
  hasUnsavedChanges?: boolean;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onUnsavedChangesChange?: (
    hasChanges: boolean,
    saveHandler: () => Promise<void>,
    discardHandler: () => void,
  ) => void;
  actions?: React.ReactNode;
}

export function DevlogDetails({
  devlogContext,
  notesContext,
  hasUnsavedChanges = false,
  onUpdate,
  onDelete,
  onUnsavedChangesChange,
  actions,
}: DevlogDetailsProps) {
  // Local state for tracking changes
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const [originalDevlog, setOriginalDevlog] = useState<DevlogEntry | null>(devlogContext.data);

  // Devlog context
  const { data: devlog, loading } = devlogContext;

  // Reset local changes when devlog prop changes (e.g., after save)
  useEffect(() => {
    const devlog = devlogContext.data;
    if (!devlog || !originalDevlog) {
      setOriginalDevlog(devlog);
      return;
    }

    // Only reset if this is a completely different devlog (ID changed)
    // OR if the devlog was updated, but we don't have any unsaved changes
    // This allows real-time updates to flow through while preserving unsaved edits
    if (
      devlog.id !== originalDevlog.id ||
      (!hasUnsavedChanges && devlog.updatedAt !== originalDevlog.updatedAt)
    ) {
      setLocalChanges({});
      setOriginalDevlog(devlog);
    }
  }, [
    devlogContext.data?.id,
    devlogContext.data?.updatedAt,
    originalDevlog?.id,
    originalDevlog?.updatedAt,
    hasUnsavedChanges,
  ]);

  // Get the original value for a field from the original devlog data
  const getOriginalValue = useCallback(
    (field: string) => {
      return originalDevlog ? (originalDevlog as any)[field] : undefined;
    },
    [originalDevlog],
  );

  // Get the current value for a field (local change if exists, otherwise current devlog value)
  const getCurrentValue = useCallback(
    (field: string) => {
      const devlog = devlogContext.data;

      // If there's a local change for this field, use it
      if (localChanges[field] !== undefined) {
        return localChanges[field];
      }

      // Otherwise, use the current devlog value (which includes real-time updates)
      return devlog ? (devlog as any)[field] : undefined;
    },
    [localChanges, devlogContext.data],
  );

  // Check if a field has been changed locally (regardless of original value)
  const isFieldChanged = useCallback(
    (field: string) => {
      return localChanges[field] !== undefined;
    },
    [localChanges],
  );

  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      const originalValue = getOriginalValue(field);
      const newChanges = { ...localChanges };

      // If the value matches the original, remove it from local changes
      if (value === originalValue) {
        delete newChanges[field];
      } else {
        // Otherwise, track the change
        newChanges[field] = value;
      }

      setLocalChanges(newChanges);

      // Check if there are any actual changes from the original devlog with the new changes
      const allPossibleFields = [
        'title',
        'description',
        'status',
        'priority',
        'type',
        'businessContext',
        'technicalContext',
      ];

      const actualChanges = allPossibleFields.some((checkField) => {
        const currentValue =
          newChanges[checkField] !== undefined
            ? newChanges[checkField]
            : getOriginalValue(checkField);
        const originalFieldValue = getOriginalValue(checkField);
        return currentValue !== originalFieldValue;
      });

      // Notify parent about changes instead of managing state locally
      if (onUnsavedChangesChange) {
        onUnsavedChangesChange(actualChanges, handleSave, handleDiscard);
      }
    },
    [localChanges, getOriginalValue, onUnsavedChangesChange],
  );

  const handleSave = useCallback(async () => {
    const devlog = devlogContext.data;

    if (!devlog) return;

    try {
      // Build update data from local changes
      const updateData: any = { id: devlog.id };

      // Handle regular field changes
      Object.entries(localChanges).forEach(([field, value]) => {
        updateData[field] = value;
      });

      // Call the update function
      await onUpdate(updateData);

      // Note: localChanges will be cleared when the devlog prop updates and triggers the useEffect
    } catch (error) {
      // Let the parent handle save errors
      throw error;
    }
  }, [localChanges, devlogContext.data, onUpdate]);

  const handleDiscard = useCallback(() => {
    setLocalChanges({});
    // Note: Parent will be notified via the main useEffect when hasUnsavedChanges changes to false
  }, []);

  // Notify parent about unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges, handleSave, handleDiscard);
    }
  }, [hasUnsavedChanges, handleSave, handleDiscard, onUnsavedChangesChange]);

  const skeletonHeaders = (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/5" />
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex space-x-4 text-sm">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
  const skeletonContent = (
    <>
      {[
        { title: 'Description', rows: 4 },
        { title: 'Business Context', rows: 3 },
        { title: 'Technical Context', rows: 3 },
        { title: 'Acceptance Criteria', rows: 2 },
        { title: 'Notes', rows: 4 },
      ].map(({ title, rows }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Skeleton className="h-5 w-5 mr-2" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
  const skeletonSideNav = (
    <>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions skeleton */}
      <div className="border-t pt-4">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="px-6 overflow-y-auto">
      {/* Header Area */}
      <div className="sticky top-0 z-10 bg-background h-36 py-4 mb-4 border-b">
        {loading || !devlog ? (
          skeletonHeaders
        ) : (
          <div className="space-y-4">
            <EditableField
              key={`title-${getCurrentValue('title')}`}
              value={getCurrentValue('title')}
              onSave={(value: any) => handleFieldChange('title', value)}
              placeholder="Enter title"
              className={cn(
                'text-2xl font-bold h-8',
                isFieldChanged('title') && 'ring-2 ring-primary/20 bg-primary/5',
              )}
            >
              <h2
                className="text-2xl font-bold text-nowrap text-ellipsis overflow-hidden"
                title={getCurrentValue('title')}
              >
                {getCurrentValue('title')}
              </h2>
            </EditableField>

            <div className="flex flex-wrap gap-2">
              <EditableField
                key={`status-${getCurrentValue('status')}`}
                className={cn(
                  'inline-block',
                  isFieldChanged('status') && 'ring-2 ring-primary/20 bg-primary/5 rounded',
                )}
                type="select"
                value={getCurrentValue('status')}
                options={statusOptions}
                onSave={(value: any) => handleFieldChange('status', value)}
              >
                <DevlogStatusTag status={getCurrentValue('status')} />
              </EditableField>

              <EditableField
                key={`priority-${getCurrentValue('priority')}`}
                className={cn(
                  'inline-block',
                  isFieldChanged('priority') && 'ring-2 ring-primary/20 bg-primary/5 rounded',
                )}
                type="select"
                value={getCurrentValue('priority')}
                options={priorityOptions}
                onSave={(value: any) => handleFieldChange('priority', value)}
              >
                <DevlogPriorityTag priority={getCurrentValue('priority')} />
              </EditableField>

              <EditableField
                key={`type-${getCurrentValue('type')}`}
                className={cn(
                  'inline-block',
                  isFieldChanged('type') && 'ring-2 ring-primary/20 bg-primary/5 rounded',
                )}
                type="select"
                value={getCurrentValue('type')}
                options={typeOptions}
                onSave={(value: any) => handleFieldChange('type', value)}
              >
                <DevlogTypeTag type={getCurrentValue('type')} />
              </EditableField>
            </div>

            <div className="flex space-x-4 text-sm text-muted-foreground">
              <span>ID: #{devlog.id}</span>
              <span title={formatTimeAgoWithTooltip(devlog.createdAt).fullDate}>
                Created: {formatTimeAgoWithTooltip(devlog.createdAt).timeAgo}
              </span>
              <span title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}>
                Updated: {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-4">
          {loading || !devlog ? (
            skeletonContent
          ) : (
            <>
              {/* Description */}
              <Card id="description">
                <CardHeader>
                  <CardTitle className="section-header flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EditableField
                    value={getCurrentValue('description')}
                    onSave={(value: any) => handleFieldChange('description', value)}
                    type="markdown"
                    placeholder="Enter description"
                    emptyText="Click to add description..."
                    className={cn(
                      isFieldChanged('description') &&
                        'ring-2 ring-primary/20 bg-primary/5 rounded p-2',
                    )}
                    borderless={false}
                  >
                    <MarkdownRenderer content={getCurrentValue('description')} />
                  </EditableField>
                </CardContent>
              </Card>

              {/* Business Context */}
              {devlog.businessContext && (
                <Card id="business-context">
                  <CardHeader>
                    <CardTitle className="section-header flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Business Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditableField
                      value={getCurrentValue('businessContext')}
                      onSave={(value: any) => handleFieldChange('businessContext', value)}
                      type="markdown"
                      placeholder="Why this work matters and what problem it solves"
                      emptyText="Click to add business context..."
                      className={cn(
                        isFieldChanged('businessContext') &&
                          'ring-2 ring-primary/20 bg-primary/5 rounded p-2',
                      )}
                      borderless={false}
                    >
                      <MarkdownRenderer content={getCurrentValue('businessContext')} />
                    </EditableField>
                  </CardContent>
                </Card>
              )}

              {/* Technical Context */}
              {devlog.technicalContext && (
                <Card id="technical-context">
                  <CardHeader>
                    <CardTitle className="section-header flex items-center">
                      <Wrench className="h-5 w-5 mr-2" />
                      Technical Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditableField
                      value={getCurrentValue('technicalContext')}
                      onSave={(value: any) => handleFieldChange('technicalContext', value)}
                      type="markdown"
                      placeholder="Architecture decisions, constraints, assumptions"
                      emptyText="Click to add technical context..."
                      className={cn(
                        isFieldChanged('technicalContext') &&
                          'ring-2 ring-primary/20 bg-primary/5 rounded p-2',
                      )}
                      borderless={false}
                    >
                      <MarkdownRenderer content={getCurrentValue('technicalContext')} />
                    </EditableField>
                  </CardContent>
                </Card>
              )}

              {/* Acceptance Criteria */}
              {devlog.acceptanceCriteria && devlog.acceptanceCriteria.length > 0 && (
                <Card id="acceptance-criteria">
                  <CardHeader>
                    <CardTitle className="section-header flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Acceptance Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {devlog.acceptanceCriteria.map((criteria, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Checkbox disabled checked={false} className="mt-1" />
                          <span className="text-sm">{criteria}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dependencies */}
              {devlog.dependencies && devlog.dependencies.length > 0 && (
                <Card id="dependencies">
                  <CardHeader>
                    <CardTitle className="section-header flex items-center">
                      <Network className="h-5 w-5 mr-2" />
                      Dependencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {devlog.dependencies.map((dependency, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-3 border border-border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">#{dependency.id}</Badge>
                              <span className="font-medium">{dependency.description}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card id="notes" className="border-none">
                <CardHeader>
                  <CardTitle className="section-header flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Notes ({notesContext.data?.length || 0})
                    {notesContext.loading && (
                      <span className="ml-2 text-sm text-muted-foreground">(Loading...)</span>
                    )}
                    {notesContext.error && (
                      <span className="ml-2 text-sm text-red-500">({notesContext.error})</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notesContext.loading && notesContext.data?.length === 0 ? (
                    // Show skeleton loading state when initially loading notes
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border-l-4 border-primary/20 pl-4 py-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notesContext.data && notesContext.data?.length > 0 ? (
                    <div className="space-y-6">
                      {[...notesContext.data].map((note) => {
                        return (
                          <div
                            key={note.id}
                            className={cn(
                              'border-l-4 border-primary/20 pl-4 py-1 transition-all duration-500',
                            )}
                          >
                            <div className="flex items-center space-x-2 mb-4">
                              {getCategoryIconRaw(note.category as NoteCategory)}
                              <Badge variant="secondary" className="text-xs">
                                {note.category}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                <span title={formatTimeAgoWithTooltip(note.timestamp).fullDate}>
                                  {formatTimeAgoWithTooltip(note.timestamp).timeAgo}
                                </span>
                              </span>
                            </div>
                            <MarkdownRenderer
                              content={note.content}
                              className="prose prose-sm max-w-none"
                              maxHeight={false}
                              noPadding
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notes yet</p>
                      <p className="text-sm">Notes will appear here as they are added</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Side Navigation */}
        <div className="w-64 flex-shrink-0 sticky top-40 space-y-4">
          <div className="sticky top-40 space-y-4">
            {loading || !devlog ? (
              skeletonSideNav
            ) : (
              <>
                <DevlogAnchorNav devlog={devlog} notesCount={notesContext.data?.length || 0} />
                {actions && (
                  <div className="border-t pt-4">
                    <div className="space-y-3">{actions}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
