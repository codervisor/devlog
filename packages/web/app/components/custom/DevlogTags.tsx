import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DevlogStatus, DevlogPriority, DevlogType } from '@codervisor/devlog-core';
import {
  getStatusIcon,
  getPriorityIcon,
  getTypeIcon,
} from '@/lib/devlog-ui-utils';
import { getStatusLabel, getPriorityLabel, getTypeLabel } from '@/lib/devlog-options';
import { cn } from '@/lib/utils';

export interface DevlogStatusTagProps {
  status: DevlogStatus;
  className?: string;
}

export function DevlogStatusTag({ status, className }: DevlogStatusTagProps) {
  const getStatusVariant = (status: DevlogStatus) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'in-progress': return 'default';
      case 'blocked': return 'destructive';
      case 'in-review': return 'outline';
      case 'testing': return 'secondary';
      case 'done': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      className={cn("inline-flex items-center gap-1", className)}
    >
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </Badge>
  );
}

export interface DevlogPriorityTagProps {
  priority: DevlogPriority;
  className?: string;
}

export function DevlogPriorityTag({ priority, className }: DevlogPriorityTagProps) {
  const getPriorityVariant = (priority: DevlogPriority) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Badge 
      variant={getPriorityVariant(priority)} 
      className={cn("inline-flex items-center gap-1", className)}
    >
      {getPriorityIcon(priority)}
      {getPriorityLabel(priority)}
    </Badge>
  );
}

export interface DevlogTypeTagProps {
  type: DevlogType;
  className?: string;
}

export function DevlogTypeTag({ type, className }: DevlogTypeTagProps) {
  const getTypeVariant = (type: DevlogType) => {
    switch (type) {
      case 'feature': return 'default';
      case 'bugfix': return 'destructive';
      case 'task': return 'secondary';
      case 'refactor': return 'outline';
      case 'docs': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Badge 
      variant={getTypeVariant(type)} 
      className={cn("inline-flex items-center gap-1", className)}
    >
      {getTypeIcon(type)}
      {getTypeLabel(type)}
    </Badge>
  );
}
