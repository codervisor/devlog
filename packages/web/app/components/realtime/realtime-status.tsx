/**
 * Realtime status component for debugging and monitoring
 */

'use client';

import { useRealtime } from '@/hooks/use-realtime';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RealtimeStatusProps {
  className?: string;
  showProvider?: boolean;
  variant?: 'minimal' | 'detailed';
}

export function RealtimeStatus({ 
  className, 
  showProvider = true, 
  variant = 'minimal' 
}: RealtimeStatusProps) {
  const { connected, providerType } = useRealtime();

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        {showProvider && providerType && (
          <Badge variant="outline" className="text-xs">
            {providerType.toUpperCase()}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          connected ? 'bg-green-500' : 'bg-red-500'
        )}
      />
      <span className="text-muted-foreground">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      {showProvider && providerType && (
        <Badge variant="outline" className="text-xs">
          {providerType.toUpperCase()}
        </Badge>
      )}
    </div>
  );
}

/**
 * Debug component that shows detailed realtime information
 */
export function RealtimeDebugInfo({ className }: { className?: string }) {
  const { connected, providerType } = useRealtime();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={cn('rounded-lg border p-4 space-y-2', className)}>
      <h3 className="text-sm font-medium">Realtime Debug Info</h3>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
        <div>Provider: {providerType || 'Unknown'}</div>
        <div>Environment: {process.env.NODE_ENV}</div>
        <div>
          Vercel: {process.env.NEXT_PUBLIC_VERCEL === '1' ? 'Yes' : 'No'}
        </div>
        <div>
          Pusher Configured: {
            process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER 
              ? 'Yes' 
              : 'No'
          }
        </div>
      </div>
    </div>
  );
}
