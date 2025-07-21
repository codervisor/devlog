/**
 * React components and utilities for devlog emoji icons
 *
 * Provides React components for displaying emoji icons for devlog fields,
 * with support for fallback to text and conditional rendering.
 */

import React from 'react';
import { 
  DevlogPriority, 
  DevlogStatus, 
  DevlogType,
  getStatusEmojiByStyle,
  getPriorityEmoji,
  getTypeEmoji,
  getStatusDisplayWithEmoji,
  getPriorityDisplayWithEmoji,
  getTypeDisplayWithEmoji,
  type EmojiStyle
} from '@devlog/core';

/**
 * Component props for devlog icon display
 */
interface DevlogIconProps {
  type: 'status' | 'priority' | 'type';
  value: DevlogStatus | DevlogPriority | DevlogType;
  useEmoji?: boolean;
  emojiStyle?: EmojiStyle;
  showText?: boolean;
  className?: string;
}

/**
 * React component for displaying devlog field icons with emoji or fallback
 */
export const DevlogIcon: React.FC<DevlogIconProps> = ({ 
  type, 
  value, 
  useEmoji = true, 
  emojiStyle = 'default',
  showText = false,
  className = ''
}) => {
  const getDisplay = () => {
    if (!useEmoji) {
      // Fallback to text display
      return showText ? value : value.charAt(0).toUpperCase();
    }

    if (showText) {
      switch (type) {
        case 'status':
          return getStatusDisplayWithEmoji(value as DevlogStatus, emojiStyle);
        case 'priority':
          return getPriorityDisplayWithEmoji(value as DevlogPriority);
        case 'type':
          return getTypeDisplayWithEmoji(value as DevlogType);
      }
    } else {
      switch (type) {
        case 'status':
          return getStatusEmojiByStyle(value as DevlogStatus, emojiStyle);
        case 'priority':
          return getPriorityEmoji(value as DevlogPriority);
        case 'type':
          return getTypeEmoji(value as DevlogType);
      }
    }
  };

  const display = getDisplay();
  
  return (
    <span 
      className={className}
      title={`${type}: ${value}`}
      role="img"
      aria-label={`${type}: ${value}`}
    >
      {display}
    </span>
  );
};

/**
 * Specialized components for each field type
 */
export const StatusIcon: React.FC<{
  status: DevlogStatus;
  useEmoji?: boolean;
  emojiStyle?: EmojiStyle;
  showText?: boolean;
  className?: string;
}> = ({ status, ...props }) => (
  <DevlogIcon type="status" value={status} {...props} />
);

export const PriorityIcon: React.FC<{
  priority: DevlogPriority;
  useEmoji?: boolean;
  showText?: boolean;
  className?: string;
}> = ({ priority, ...props }) => (
  <DevlogIcon type="priority" value={priority} {...props} />
);

export const TypeIcon: React.FC<{
  type: DevlogType;
  useEmoji?: boolean;
  showText?: boolean;
  className?: string;
}> = ({ type, ...props }) => (
  <DevlogIcon type="type" value={type} {...props} />
);

/**
 * Combined display component for showing multiple devlog fields
 */
export const DevlogFieldIcons: React.FC<{
  status?: DevlogStatus;
  priority?: DevlogPriority;
  type?: DevlogType;
  useEmoji?: boolean;
  emojiStyle?: EmojiStyle;
  showText?: boolean;
  className?: string;
  separator?: string;
}> = ({ 
  status, 
  priority, 
  type, 
  useEmoji = true,
  emojiStyle = 'default',
  showText = false,
  className = '',
  separator = ' '
}) => {
  const icons: React.ReactNode[] = [];

  if (status) {
    icons.push(
      <StatusIcon 
        key="status"
        status={status} 
        useEmoji={useEmoji}
        emojiStyle={emojiStyle}
        showText={showText}
      />
    );
  }

  if (type) {
    icons.push(
      <TypeIcon 
        key="type"
        type={type} 
        useEmoji={useEmoji}
        showText={showText}
      />
    );
  }

  if (priority && priority !== 'medium') {
    icons.push(
      <PriorityIcon 
        key="priority"
        priority={priority} 
        useEmoji={useEmoji}
        showText={showText}
      />
    );
  }

  if (icons.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {icons.map((icon, index) => (
        <React.Fragment key={index}>
          {index > 0 && separator}
          {icon}
        </React.Fragment>
      ))}
    </span>
  );
};

/**
 * Hook for getting emoji mappings in React components
 */
export const useDevlogEmojis = () => {
  return React.useMemo(() => ({
    getStatusEmoji: (status: DevlogStatus, style: EmojiStyle = 'default') => 
      getStatusEmojiByStyle(status, style),
    getPriorityEmoji,
    getTypeEmoji,
    getStatusDisplay: (status: DevlogStatus, style: EmojiStyle = 'default') => 
      getStatusDisplayWithEmoji(status, style),
    getPriorityDisplay: getPriorityDisplayWithEmoji,
    getTypeDisplay: getTypeDisplayWithEmoji,
  }), []);
};

/**
 * Utility component for emoji legend/reference
 */
export const EmojiLegend: React.FC<{
  fields?: ('status' | 'priority' | 'type')[];
  emojiStyle?: EmojiStyle;
  className?: string;
}> = ({ 
  fields = ['status', 'priority', 'type'],
  emojiStyle = 'default',
  className = ''
}) => {
  const statuses: DevlogStatus[] = ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'];
  const priorities: DevlogPriority[] = ['low', 'medium', 'high', 'critical'];
  const types: DevlogType[] = ['feature', 'bugfix', 'task', 'refactor', 'docs'];

  return (
    <div className={className}>
      {fields.includes('status') && (
        <div>
          <h4>Status Icons</h4>
          <div className="space-y-1">
            {statuses.map(status => (
              <div key={status} className="flex items-center gap-2">
                <StatusIcon status={status} emojiStyle={emojiStyle} />
                <span className="capitalize">{status.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.includes('priority') && (
        <div>
          <h4>Priority Icons</h4>
          <div className="space-y-1">
            {priorities.map(priority => (
              <div key={priority} className="flex items-center gap-2">
                <PriorityIcon priority={priority} />
                <span className="capitalize">{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.includes('type') && (
        <div>
          <h4>Type Icons</h4>
          <div className="space-y-1">
            {types.map(type => (
              <div key={type} className="flex items-center gap-2">
                <TypeIcon type={type} />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
