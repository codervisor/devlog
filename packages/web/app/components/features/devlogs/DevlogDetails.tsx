'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, Checkbox, List, Skeleton, Space, Tag, Timeline, Typography } from 'antd';
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
import { DevlogEntry } from '@devlog/core';
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
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onUnsavedChangesChange?: (
    hasChanges: boolean,
    saveHandler: () => Promise<void>,
    discardHandler: () => void,
    isSaving: boolean,
    saveError: string | null,
  ) => void;
}

export function DevlogDetails({
  devlog,
  loading = false,
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    if (devlog.id !== originalDevlog.id || (!hasUnsavedChanges && devlog.updatedAt !== originalDevlog.updatedAt)) {
      setLocalChanges({});
      setOriginalDevlog(devlog);
      setHasUnsavedChanges(false);
      setSaveError(null);
    }
  }, [devlog.id, devlog.updatedAt, originalDevlog.id, originalDevlog.updatedAt, hasUnsavedChanges]);

  // Get the original value for a field from the original devlog data
  const getOriginalValue = useCallback(
    (field: string) => {
      if (field.startsWith('context.')) {
        const contextField = field.substring(8) as keyof typeof originalDevlog.context;
        return (originalDevlog.context?.[contextField] as any) || '';
      }
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
      if (field.startsWith('context.')) {
        const contextField = field.substring(8) as keyof typeof devlog.context;
        return (devlog.context?.[contextField] as any) || '';
      }
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
      'context.businessContext',
      'context.technicalContext',
    ];

    const actualChanges = allPossibleFields.some((checkField) => {
      const currentValue =
        newChanges[checkField] !== undefined
          ? newChanges[checkField]
          : getOriginalValue(checkField);
      const originalFieldValue = getOriginalValue(checkField);
      return currentValue !== originalFieldValue;
    });

    setHasUnsavedChanges(actualChanges);
    setSaveError(null);
  };

  const handleContextChange = (contextField: string, value: string) => {
    handleFieldChange(`context.${contextField}`, value);
  };

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Build update data from local changes
      const updateData: any = { id: devlog.id };

      // Handle regular field changes
      Object.entries(localChanges).forEach(([field, value]) => {
        if (field.startsWith('context.')) {
          const contextField = field.substring(8);
          if (!updateData.context) {
            updateData.context = { ...devlog.context };
          }
          updateData.context[contextField] = value;
        } else {
          updateData[field] = value;
        }
      });

      // Call the update function
      onUpdate(updateData);

      // Note: localChanges will be cleared when the devlog prop updates and triggers the useEffect
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [localChanges, devlog.id, devlog.context, onUpdate]);

  const handleDiscard = useCallback(() => {
    setLocalChanges({});
    setHasUnsavedChanges(false);
    setSaveError(null);
  }, []);

  // Notify parent about unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges, handleSave, handleDiscard, isSaving, saveError);
    }
  }, [hasUnsavedChanges, isSaving, saveError, onUnsavedChangesChange, handleSave, handleDiscard]);

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
            value={getCurrentValue('context.businessContext')}
            onSave={(value) => handleContextChange('businessContext', value)}
            type="markdown"
            placeholder="Why this work matters and what problem it solves"
            emptyText="Click to add business context..."
            className={isFieldChanged('context.businessContext') ? styles.fieldChanged : ''}
            borderless={false}
          >
            <MarkdownRenderer content={getCurrentValue('context.businessContext')} />
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
            value={getCurrentValue('context.technicalContext')}
            onSave={(value) => handleContextChange('technicalContext', value)}
            type="markdown"
            placeholder="Architecture decisions, constraints, assumptions"
            emptyText="Click to add technical context..."
            className={isFieldChanged('context.technicalContext') ? styles.fieldChanged : ''}
            borderless={false}
          >
            <MarkdownRenderer content={getCurrentValue('context.technicalContext')} />
          </EditableField>
        </div>

        {devlog.context?.acceptanceCriteria && devlog.context.acceptanceCriteria.length > 0 && (
          <div className={styles.criteriaSection} id="acceptance-criteria">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <CheckCircleOutlined className={styles.sectionIcon} />
                Acceptance Criteria
              </Title>
            </div>
            <Card size="small">
              <List
                dataSource={devlog.context.acceptanceCriteria}
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

        {devlog.context?.dependencies && devlog.context.dependencies.length > 0 && (
          <div className={styles.dependencySection} id="dependencies">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <NodeIndexOutlined className={styles.sectionIcon} />
                Dependencies
              </Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {devlog.context.dependencies.map((dep, index) => (
                <Card key={index} size="small" className={styles.dependencyCard}>
                  <div className={styles.dependencyHeader}>
                    <div>
                      <Text strong>{dep.description}</Text>
                      {dep.externalId && (
                        <div className={styles.dependencyInfo}>
                          <Text type="secondary">External ID: {dep.externalId}</Text>
                        </div>
                      )}
                    </div>
                    <Tag
                      color={
                        dep.type === 'blocks'
                          ? 'red'
                          : dep.type === 'blocked-by'
                            ? 'orange'
                            : 'blue'
                      }
                    >
                      {dep.type}
                    </Tag>
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {devlog.context?.decisions && devlog.context.decisions.length > 0 && (
          <div className={styles.decisionSection} id="decisions">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <SettingOutlined style={{ marginRight: 8, color: '#13c2c2' }} />
                Decisions
              </Title>
            </div>
            <Timeline>
              {devlog.context.decisions.map((decision) => (
                <Timeline.Item key={decision.id}>
                  <div className={styles.decisionItem}>
                    <Text strong>{decision.decision}</Text>
                  </div>
                  <div className={styles.decisionContent}>
                    <Text>{decision.rationale}</Text>
                  </div>
                  {decision.alternatives && decision.alternatives.length > 0 && (
                    <div className={styles.decisionAlternatives}>
                      <Text type="secondary">Alternatives considered: </Text>
                      <Text type="secondary">{decision.alternatives.join(', ')}</Text>
                    </div>
                  )}
                  <Text type="secondary" className={styles.noteTimestamp}>
                    By {decision.decisionMaker} •{' '}
                    <span title={formatTimeAgoWithTooltip(decision.timestamp).fullDate}>
                      {formatTimeAgoWithTooltip(decision.timestamp).timeAgo}
                    </span>
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}

        {devlog.context?.risks && devlog.context.risks.length > 0 && (
          <div className={styles.riskSection} id="risks">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <WarningOutlined className={styles.sectionIcon} />
                Risks
              </Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {devlog.context.risks.map((risk, index) => (
                <Card key={index} size="small" className={styles.riskCard}>
                  <div>
                    <div className={styles.riskHeader}>
                      <Text strong>{risk.description}</Text>
                      <Space>
                        <Tag
                          color={
                            risk.impact === 'high'
                              ? 'red'
                              : risk.impact === 'medium'
                                ? 'orange'
                                : 'green'
                          }
                        >
                          Impact: {risk.impact}
                        </Tag>
                        <Tag
                          color={
                            risk.probability === 'high'
                              ? 'red'
                              : risk.probability === 'medium'
                                ? 'orange'
                                : 'green'
                          }
                        >
                          Probability: {risk.probability}
                        </Tag>
                      </Space>
                    </div>
                    <div className={styles.riskMitigation}>
                      <Text type="secondary">Mitigation: </Text>
                      <Text>{risk.mitigation}</Text>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {devlog.files && devlog.files.length > 0 && (
          <div className={styles.fileSection} id="files">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <FileTextOutlined className={styles.sectionIcon} />
                Related Files
              </Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {devlog.files.map((file, index) => (
                <Card key={index} size="small" className={styles.fileCard}>
                  <Text code>{file}</Text>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {devlog.relatedDevlogs && devlog.relatedDevlogs.length > 0 && (
          <div className={styles.relatedSection} id="related-devlogs">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <LinkOutlined className={styles.sectionIcon} />
                Related Devlogs
              </Title>
            </div>
            <Space wrap>
              {devlog.relatedDevlogs.map((relatedId, index) => (
                <Tag key={index} color="cyan">
                  #{relatedId}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {devlog.aiContext &&
          (devlog.aiContext.currentSummary ||
            (devlog.aiContext.keyInsights && devlog.aiContext.keyInsights.length > 0) ||
            (devlog.aiContext.openQuestions && devlog.aiContext.openQuestions.length > 0) ||
            (devlog.aiContext.suggestedNextSteps &&
              devlog.aiContext.suggestedNextSteps.length > 0) ||
            (devlog.aiContext.relatedPatterns && devlog.aiContext.relatedPatterns.length > 0)) && (
            <div className={styles.aiContextSection} id="ai-context">
              <div className={styles.sectionHeader}>
                <Title level={3}>
                  <RobotOutlined className={styles.sectionIcon} />
                  AI Context
                </Title>
              </div>
              <Card>
                {devlog.aiContext.currentSummary && (
                  <div className={styles.aiSection}>
                    <Text strong>Summary:</Text>
                    <MarkdownRenderer content={devlog.aiContext.currentSummary} />
                  </div>
                )}

                {devlog.aiContext.keyInsights && devlog.aiContext.keyInsights.length > 0 && (
                  <div className={styles.aiSection}>
                    <Text strong>Key Insights:</Text>
                    <List
                      size="small"
                      style={{ marginTop: '8px' }}
                      dataSource={devlog.aiContext.keyInsights}
                      renderItem={(insight) => (
                        <List.Item className={styles.aiInsightItem}>
                          <Space align="start">
                            <BulbOutlined style={{ color: '#faad14', marginTop: '2px' }} />
                            <Text>{insight}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {devlog.aiContext.openQuestions && devlog.aiContext.openQuestions.length > 0 && (
                  <div className={styles.aiSection}>
                    <Text strong>Open Questions:</Text>
                    <List
                      size="small"
                      style={{ marginTop: '8px' }}
                      dataSource={devlog.aiContext.openQuestions}
                      renderItem={(question) => (
                        <List.Item className={styles.aiQuestionItem}>
                          <Space align="start">
                            <QuestionCircleOutlined
                              style={{ color: '#f5222d', marginTop: '2px' }}
                            />
                            <Text>{question}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {devlog.aiContext.suggestedNextSteps &&
                  devlog.aiContext.suggestedNextSteps.length > 0 && (
                    <div className={styles.aiSection}>
                      <Text strong>Suggested Next Steps:</Text>
                      <List
                        size="small"
                        style={{ marginTop: '8px' }}
                        dataSource={devlog.aiContext.suggestedNextSteps}
                        renderItem={(step) => (
                          <List.Item className={styles.aiStepItem}>
                            <Space align="start">
                              <RightOutlined style={{ color: '#52c41a', marginTop: '2px' }} />
                              <Text>{step}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                {devlog.aiContext.relatedPatterns &&
                  devlog.aiContext.relatedPatterns.length > 0 && (
                    <div className={styles.aiSection}>
                      <Text strong>Related Patterns:</Text>
                      <List
                        size="small"
                        style={{ marginTop: '8px' }}
                        dataSource={devlog.aiContext.relatedPatterns}
                        renderItem={(pattern) => (
                          <List.Item className={styles.aiPatternItem}>
                            <Space align="start">
                              <ApartmentOutlined style={{ color: '#722ed1', marginTop: '2px' }} />
                              <Text>{pattern}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                <div>
                  <Text type="secondary" className={styles.aiUpdateInfo}>
                    Last AI Update:{' '}
                    <span
                      title={formatTimeAgoWithTooltip(devlog.aiContext?.lastAIUpdate)?.fullDate}
                    >
                      {formatTimeAgoWithTooltip(devlog.aiContext?.lastAIUpdate)?.timeAgo}
                    </span>{' '}
                    • Version: {devlog.aiContext.contextVersion}
                  </Text>
                </div>
              </Card>
            </div>
          )}

        {devlog.externalReferences && devlog.externalReferences.length > 0 && (
          <div className={styles.externalRefSection} id="external-references">
            <div className={styles.sectionHeader}>
              <Title level={3}>
                <LinkOutlined className={styles.sectionIcon} />
                External References
              </Title>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {devlog.externalReferences.map((ref, index) => (
                <Card key={index} size="small" className={styles.externalRefCard}>
                  <div className={styles.externalRefHeader}>
                    <div>
                      <Text strong>{ref.title || ref.id}</Text>
                      {ref.url && (
                        <div>
                          <a href={ref.url} target="_blank" rel="noopener noreferrer">
                            <Text className={styles.externalRefLink}>{ref.url}</Text>
                          </a>
                        </div>
                      )}
                      {ref.status && (
                        <div className={styles.externalRefStatus}>
                          <Text type="secondary">Status: {ref.status}</Text>
                        </div>
                      )}
                      {ref.lastSync && (
                        <div className={styles.externalRefSync}>
                          <Text type="secondary">
                            Last Sync:{' '}
                            <span title={formatTimeAgoWithTooltip(ref.lastSync).fullDate}>
                              {formatTimeAgoWithTooltip(ref.lastSync).timeAgo}
                            </span>
                          </Text>
                        </div>
                      )}
                    </div>
                    <Tag color="blue">{ref.system}</Tag>
                  </div>
                </Card>
              ))}
            </Space>
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
              {[...devlog.notes].reverse().map((note) => (
                <Timeline.Item key={note.id} dot={getCategoryIcon(note.category)}>
                  <div className={styles.noteItem}>
                    <MarkdownRenderer content={note.content} maxHeight={false} />
                  </div>
                  <Text type="secondary" className={styles.noteTimestamp}>
                    <span title={formatTimeAgoWithTooltip(note.timestamp).fullDate}>
                      {formatTimeAgoWithTooltip(note.timestamp).timeAgo}
                    </span>
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}
      </div>

      <DevlogAnchorNav devlog={devlog} />
    </div>
  );
}
