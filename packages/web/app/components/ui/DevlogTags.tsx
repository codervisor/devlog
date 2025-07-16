import React from 'react';
import { Tag } from 'antd';
import { DevlogStatus, DevlogPriority, DevlogType } from '@devlog/core';
import {
  getStatusColor,
  getStatusIcon,
  getPriorityColor,
  getPriorityIcon,
  getTypeColor,
  getTypeIcon,
} from '@/lib/devlog-ui-utils';
import {
  getStatusLabel,
  getPriorityLabel,
  getTypeLabel,
} from '@/lib/devlog-options';

export interface DevlogStatusTagProps {
  status: DevlogStatus;
  className?: string;
}

export function DevlogStatusTag({ status, className }: DevlogStatusTagProps) {
  return (
    <Tag
      className={className}
      color={getStatusColor(status)}
      icon={getStatusIcon(status)}
    >
      {getStatusLabel(status)}
    </Tag>
  );
}

export interface DevlogPriorityTagProps {
  priority: DevlogPriority;
  className?: string;
}

export function DevlogPriorityTag({ priority, className }: DevlogPriorityTagProps) {
  return (
    <Tag
      className={className}
      color={getPriorityColor(priority)}
      icon={getPriorityIcon(priority)}
    >
      {getPriorityLabel(priority)}
    </Tag>
  );
}

export interface DevlogTypeTagProps {
  type: DevlogType;
  className?: string;
}

export function DevlogTypeTag({ type, className }: DevlogTypeTagProps) {
  return (
    <Tag
      className={className}
      color={getTypeColor(type)}
      icon={getTypeIcon(type)}
    >
      {getTypeLabel(type)}
    </Tag>
  );
}
