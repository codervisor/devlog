'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, Checkbox, List, Skeleton, Space, Tag, Timeline, Typography } from 'antd';
import classNames from 'classnames';
import {
  ApartmentOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  RobotOutlined,
  SettingOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { DevlogEntry } from '@codervisor/devlog-core';
import { EditableField, MarkdownRenderer } from '@/components/ui';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import styles from './DevlogDetails.module.css';
import { getCategoryIcon } from '@/lib/note-utils';
import { priorityOptions, statusOptions, typeOptions } from '@/lib/devlog-options';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag } from '@/components';
import { useStickyHeaders } from '@/hooks/useStickyHeaders';
import { DevlogAnchorNav } from './DevlogAnchorNav';

const { Title, Text } = Typography;

interface DevlogDetailsProps {
  devlog?: DevlogEntry;
  loading?: boolean;
  hasUnsavedChanges?: boolean;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onUnsavedChangesChange?: (
    hasChanges: boolean,
    saveHandler: () => Promise<void>,
    discardHandler: () => void,
  ) => void;
}

export function DevlogDetails({
  devlog,
  loading = false,
  hasUnsavedChanges = false,
  onUpdate,
  onUnsavedChangesChange,
}: DevlogDetailsProps) {
  // If loading, show skeleton
  if (loading || !devlog) {
    return (
      <div>
        <div className={styles.devlogDetailsHeader}>
          <div className={styles.devlogTitleWrapper}>
            <Skeleton.Input style={{ width: '60%', height: '32px' }} active size="large" />
          </div>
          <div className={styles.devlogInfo}>
            <Space wrap className={styles.infoItemWrapper}>
              <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
              <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
              <Skeleton.Button style={{ width: '80px', height: '24px' }} active size="small" />
            </Space>
            <Space className={styles.metaInfo}>
              <Skeleton.Input style={{ width: '60px', height: '14px' }} active size="small" />
              <Skeleton.Input style={{ width: '120px', height: '14px' }} active size="small" />
              <Skeleton.Input style={{ width: '120px', height: '14px' }} active size="small" />
            </Space>
          </div>
        </div>

        <div className={styles.devlogDetailsContent}>
          <div className={styles.descriptionSection}>
            <Title level={4}>
              <FileTextOutlined className={styles.sectionIcon} />
              Description
            </Title>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>

          <div className={styles.contextSection}>
            <Title level={4}>
              <InfoCircleOutlined className={styles.sectionIcon} />
              Business Context
            </Title>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>

          <div className={styles.contextSection}>
            <Title level={4}>
              <ToolOutlined className={styles.sectionIcon} />
              Technical Context
            </Title>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>

          <div className={styles.criteriaSection}>
            <Title level={4}>
              <CheckCircleOutlined className={styles.sectionIcon} />
              Acceptance Criteria
            </Title>
            <Card size="small">
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </div>

          <div className={styles.notesSection}>
            <Title level={4}>
              <CommentOutlined className={styles.sectionIcon} />
              Notes
            </Title>
            <Timeline>
              <Timeline.Item>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Timeline.Item>
              <Timeline.Item>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Timeline.Item>
            </Timeline>
          </div>
        </div>
      </div>
    );
  }

  // Local state for tracking changes
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const [originalDevlog, setOriginalDevlog] = useState<DevlogEntry>(devlog);

  // State for tracking note animations
  const [seenNoteIds, setSeenNoteIds] = useState<Set<string>>(new Set());
  const [newNoteIds, setNewNoteIds] = useState<Set<string>>(new Set());

  // Setup sticky header detection
  useStickyHeaders({
    selectorClass: styles.sectionHeader,
    stickyClass: styles.isSticky,
    topOffset: 96, // Account for the main devlog header
    dependencies: [devlog.id], // Re-run when devlog changes
  });

  // Reset local changes when devlog prop changes (e.g., after save)
  useEffect(() => {
    // Only reset if this is a completely different devlog (ID changed)
    // OR if the devlog was updated but we don't have any unsaved changes
    // This allows real-time updates to flow through while preserving unsaved edits
    if (
      devlog.id !== originalDevlog.id ||
      (!hasUnsavedChanges && devlog.updatedAt !== originalDevlog.updatedAt)
    ) {
      setLocalChanges({});
      setOriginalDevlog(devlog);
      // Note: Parent will be notified via the main useEffect below
    }
  }, [devlog.id, devlog.updatedAt, originalDevlog.id, originalDevlog.updatedAt, hasUnsavedChanges]);

  // Track new notes for animation
  useEffect(() => {
    if (!devlog.notes || devlog.notes.length === 0) {
      // For empty notes, just reset the seen notes if they exist
      if (seenNoteIds.size > 0) {
        setSeenNoteIds(new Set());
      }
      return;
    }

    const currentNoteIds = new Set(devlog.notes.map((note) => note.id));

    // On first load, mark all existing notes as seen without animation
    if (seenNoteIds.size === 0) {
      setSeenNoteIds(currentNoteIds);
      return;
    }

    // Find new notes that weren't seen before
    const newIds = new Set([...currentNoteIds].filter((id) => !seenNoteIds.has(id)));

    if (newIds.size > 0) {
      setNewNoteIds(newIds);
      setSeenNoteIds(currentNoteIds);

      // Clear the new note highlights after animation completes
      const timeout = setTimeout(() => {
        setNewNoteIds(new Set());
      }, 2500); // Total animation duration (0.4s slide + 2s highlight)

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [devlog.notes?.length, devlog.id]); // Remove seenNoteIds from dependencies to avoid loops

  // Get the original value for a field from the original devlog data
  const getOriginalValue = useCallback(
    (field: string) => {
      return (originalDevlog as any)[field];
    },
    [originalDevlog],
  );

  // Get the current value for a field (local change if exists, otherwise current devlog value)
  const getCurrentValue = useCallback(
    (field: string) => {
      // If there's a local change for this field, use it
      if (localChanges[field] !== undefined) {
        return localChanges[field];
      }

      // Otherwise, use the current devlog value (which includes real-time updates)
      return (devlog as any)[field];
    },
    [localChanges, devlog],
  );

  // Check if a field has been changed locally (regardless of original value)
  const isFieldChanged = useCallback(
    (field: string) => {
      return localChanges[field] !== undefined;
    },
    [localChanges],
  );

  const handleFieldChange = (field: string, value: any) => {
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
  };

  const handleSave = useCallback(async () => {
    try {
      // Build update data from local changes
      const updateData: any = { id: devlog.id };

      // Handle regular field changes
      Object.entries(localChanges).forEach(([field, value]) => {
        updateData[field] = value;
      });

      // Call the update function
      onUpdate(updateData);

      // Note: localChanges will be cleared when the devlog prop updates and triggers the useEffect
    } catch (error) {
      // Let the parent handle save errors
      throw error;
    }
  }, [localChanges, devlog.id, onUpdate]);

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

  return (
    <div>
      <div className={styles.devlogDetailsHeader}>
        <EditableField
          key={`title-${getCurrentValue('title')}`}
          value={getCurrentValue('title')}
          onSave={(value) => handleFieldChange('title', value)}
          placeholder="Enter title"
          className={`${isFieldChanged('title') ? styles.fieldChanged : ''} ${styles.devlogTitleWrapper}`}
        >
          <Title level={3} className={styles.devlogTitle} title={getCurrentValue('title')}>
            {getCurrentValue('title')}
          </Title>
        </EditableField>
        <div className={styles.devlogInfo}>
          <Space wrap className={styles.infoItemWrapper}>
            <EditableField
              key={`status-${getCurrentValue('status')}`}
              className={`${styles.infoItem} ${isFieldChanged('status') ? styles.fieldChanged : ''}`}
              type="select"
              value={getCurrentValue('status')}
              options={statusOptions}
              onSave={(value) => handleFieldChange('status', value)}
            >
              <DevlogStatusTag status={getCurrentValue('status')} className={styles.infoTag} />
            </EditableField>
            <EditableField
              key={`priority-${getCurrentValue('priority')}`}
              className={`${styles.infoItem} ${isFieldChanged('priority') ? styles.fieldChanged : ''}`}
              type="select"
              value={getCurrentValue('priority')}
              options={priorityOptions}
              onSave={(value) => handleFieldChange('priority', value)}
            >
              <DevlogPriorityTag
                priority={getCurrentValue('priority')}
                className={styles.infoTag}
              />
            </EditableField>
            <EditableField
              key={`type-${getCurrentValue('type')}`}
              className={`${styles.infoItem} ${isFieldChanged('type') ? styles.fieldChanged : ''}`}
              type="select"
              value={getCurrentValue('type')}
              onSave={(value) => handleFieldChange('type', value)}
              options={typeOptions}
            >
              <DevlogTypeTag type={getCurrentValue('type')} className={styles.infoTag} />
            </EditableField>
          </Space>
          <Space split={<Text type="secondary">•</Text>} className={styles.metaInfo}>
            <Text type="secondary" className={styles.metaText}>
              ID: #{devlog.id}
            </Text>
            <Text type="secondary" title={formatTimeAgoWithTooltip(devlog.createdAt).fullDate}>
              Created: {formatTimeAgoWithTooltip(devlog.createdAt).timeAgo}
            </Text>
            <Text type="secondary" title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}>
              Updated: {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
            </Text>
          </Space>
        </div>
      </div>

      <div className={styles.devlogDetailsContent}>
        <div className={styles.descriptionSection} id="description">
          <div className={styles.sectionHeader}>
            <Title level={3}>
              <FileTextOutlined className={styles.sectionIcon} />
              Description
            </Title>
          </div>
          <EditableField
            value={getCurrentValue('description')}
            onSave={(value) => handleFieldChange('description', value)}
            type="markdown"
            placeholder="Enter description"
            emptyText="Click to add description..."
            className={isFieldChanged('description') ? styles.fieldChanged : ''}
            borderless={false}
          >
            <MarkdownRenderer content={getCurrentValue('description')} />
          </EditableField>
        </div>

        <div className={styles.contextSection} id="business-context">
          <div className={styles.sectionHeader}>
            <Title level={3}>
              <InfoCircleOutlined className={styles.sectionIcon} />
              Business Context
            </Title>
          </div>
          <EditableField
            value={getCurrentValue('businessContext')}
            onSave={(value) => handleFieldChange('businessContext', value)}
            type="markdown"
            placeholder="Why this work matters and what problem it solves"
            emptyText="Click to add business context..."
            className={isFieldChanged('businessContext') ? styles.fieldChanged : ''}
            borderless={false}
          >
            <MarkdownRenderer content={getCurrentValue('businessContext')} />
          </EditableField>
        </div>

        <div className={styles.contextSection} id="technical-context">
          <div className={styles.sectionHeader}>
            <Title level={3}>
              <ToolOutlined className={styles.sectionIcon} />
              Technical Context
            </Title>
          </div>
          <EditableField
            value={getCurrentValue('technicalContext')}
            onSave={(value) => handleFieldChange('technicalContext', value)}
            type="markdown"
            placeholder="Architecture decisions, constraints, assumptions"
            emptyText="Click to add technical context..."
            className={isFieldChanged('technicalContext') ? styles.fieldChanged : ''}
            borderless={false}
          >
            <MarkdownRenderer content={getCurrentValue('technicalContext')} />
          </EditableField>
        </div>

        {devlog?.acceptanceCriteria && devlog.acceptanceCriteria.length > 0 && (
          <div className={styles.criteriaSection} id="acceptance-criteria">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <CheckCircleOutlined className={styles.sectionIcon} />
                Acceptance Criteria
              </Title>
            </div>
            <Card size="small">
              <List
                dataSource={devlog.acceptanceCriteria}
                renderItem={(criteria, index) => (
                  <List.Item className={styles.criteriaItem}>
                    <Space align="start">
                      <Checkbox disabled checked={false} />
                      <Text>{criteria}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        )}

        {devlog.notes && devlog.notes.length > 0 && (
          <div className={styles.notesSection} id="notes">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <CommentOutlined className={styles.sectionIcon} />
                Notes
              </Title>
            </div>
            <Timeline className={styles.notesTimeline}>
              {[...devlog.notes].reverse().map((note) => {
                const isNewNote = newNoteIds.has(note.id);
                const noteItemClass = classNames(styles.noteItem, {
                  [styles.noteItemNew]: isNewNote,
                  [styles.noteItemEnter]: !isNewNote && seenNoteIds.has(note.id),
                });

                return (
                  <Timeline.Item
                    key={note.id}
                    dot={getCategoryIcon(note.category)}
                    className={noteItemClass}
                  >
                    <div>
                      <MarkdownRenderer content={note.content} maxHeight={false} noPadding />
                    </div>
                    <Text type="secondary" className={styles.noteTimestamp}>
                      <span title={formatTimeAgoWithTooltip(note.timestamp).fullDate}>
                        {formatTimeAgoWithTooltip(note.timestamp).timeAgo}
                      </span>
                    </Text>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </div>
        )}
      </div>

      <DevlogAnchorNav devlog={devlog} />
    </div>
  );
}
