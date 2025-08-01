import { useEffect, useRef, useState } from 'react';

interface SSEMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export function useSse() {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource('/api/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('SSE message:', message);

          // Call registered listeners for this message type
          const listener = listenersRef.current.get(message.type);
          if (listener && message.data) {
            listener(message.data);
          }

          // Also dispatch as custom event for components that prefer this approach
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('sse-message', {
                detail: message,
              }),
            );
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE error, attempting to reconnect...');
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const subscribe = (messageType: string, callback: (data: any) => void) => {
    listenersRef.current.set(messageType, callback);
  };

  const unsubscribe = (messageType: string) => {
    listenersRef.current.delete(messageType);
  };

  return {
    connected,
    subscribe,
    unsubscribe,
  };
}
