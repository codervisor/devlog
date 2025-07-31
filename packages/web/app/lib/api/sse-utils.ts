/**
 * SSE Response Wrapper Utilities
 *
 * Simple wrappers for API responses that automatically trigger SSE broadcasts.
 * These can be easily integrated into existing API routes without major refactoring.
 */

import { NextResponse } from 'next/server';
import { broadcastUpdate } from '../server/sse-event-bridge.js';

/**
 * Wraps a successful response with SSE broadcasting
 */
export function createSSEResponse(
  data: any,
  eventType: string,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    transformData?: (data: any) => any;
  },
): NextResponse {
  const { status = 200, headers = {}, transformData } = options || {};

  // Create the response
  const response = NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  // Schedule SSE broadcast
  setTimeout(() => {
    try {
      const broadcastData = transformData ? transformData(data) : data;

      // Only broadcast if we have successful data
      if (data.success && data.data) {
        broadcastUpdate(eventType, broadcastData.data || broadcastData);
      }
    } catch (error) {
      console.error('Error broadcasting SSE update:', error);
    }
  }, 0);

  return response;
}

/**
 * Utility functions for common devlog operations
 */
export const DevlogSSE = {
  /**
   * Create response for devlog creation with SSE broadcast
   */
  created: (data: any, options?: { status?: number }) =>
    createSSEResponse(data, 'devlog-created', { status: options?.status || 201 }),

  /**
   * Create response for devlog update with SSE broadcast
   */
  updated: (data: any) => createSSEResponse(data, 'devlog-updated'),

  /**
   * Create response for devlog deletion with SSE broadcast
   */
  deleted: (data: any, devlogId?: string | number) =>
    createSSEResponse(data, 'devlog-deleted', {
      transformData: () => ({
        id: devlogId || data.data?.id,
        deletedAt: new Date().toISOString(),
      }),
    }),

  /**
   * Create response for devlog archival with SSE broadcast
   */
  archived: (data: any) => createSSEResponse(data, 'devlog-archived'),

  /**
   * Create response for devlog unarchival with SSE broadcast
   */
  unarchived: (data: any) => createSSEResponse(data, 'devlog-unarchived'),

  /**
   * Create response for devlog completion with SSE broadcast
   */
  completed: (data: any) => createSSEResponse(data, 'devlog-completed'),
};

/**
 * Utility functions for note operations
 */
export const NoteSSE = {
  /**
   * Create response for note creation with SSE broadcast
   */
  created: (data: any) => createSSEResponse(data, 'note-added', { status: 201 }),

  /**
   * Create response for note update with SSE broadcast
   */
  updated: (data: any) => createSSEResponse(data, 'note-updated'),

  /**
   * Create response for note deletion with SSE broadcast
   */
  deleted: (data: any, noteId?: string | number, devlogId?: string | number) =>
    createSSEResponse(data, 'note-deleted', {
      transformData: () => ({
        id: noteId || data.data?.id,
        devlogId: devlogId || data.data?.devlogId,
        deletedAt: new Date().toISOString(),
      }),
    }),
};

/**
 * Generic SSE response wrapper that can be used for any operation
 */
export function withSSE(
  responsePromise: Promise<NextResponse> | NextResponse,
  eventType: string,
  dataExtractor?: (response: any) => any,
): Promise<NextResponse> {
  if (responsePromise instanceof NextResponse) {
    // Handle immediate response
    return handleSSEResponse(responsePromise, eventType, dataExtractor);
  }

  // Handle promise
  return responsePromise.then((response) => handleSSEResponse(response, eventType, dataExtractor));
}

async function handleSSEResponse(
  response: NextResponse,
  eventType: string,
  dataExtractor?: (response: any) => any,
): Promise<NextResponse> {
  try {
    // Clone response to read data without consuming it
    const responseClone = response.clone();
    const responseData = await responseClone.json();

    // Schedule broadcast
    setTimeout(() => {
      try {
        if (responseData.success && responseData.data) {
          const broadcastData = dataExtractor ? dataExtractor(responseData) : responseData.data;

          broadcastUpdate(eventType, broadcastData);
        }
      } catch (error) {
        console.error('Error in SSE broadcast:', error);
      }
    }, 0);
  } catch (error) {
    console.error('Error processing SSE response:', error);
  }

  return response;
}
