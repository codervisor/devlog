/**
 * Chat Session API Endpoint
 * 
 * POST /api/chat-sessions - Create/update chat session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@codervisor/devlog-core/server';
import { ChatSessionCreateSchema } from '@/schemas/hierarchy';
import { ApiValidator } from '@/schemas/validation';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/chat-sessions - Create/update chat session
 * 
 * Creates a new chat session or updates an existing one based on sessionId.
 * Supports updating message count, token count, and end time.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await ApiValidator.validateJsonBody(
      request,
      ChatSessionCreateSchema
    );

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Get Prisma client
    const prisma = getPrismaClient();

    // Upsert chat session
    const session = await prisma.chatSession.upsert({
      where: { sessionId: data.sessionId },
      create: {
        sessionId: data.sessionId,
        workspaceId: data.workspaceId,
        agentType: data.agentType,
        modelId: data.modelId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        messageCount: data.messageCount,
        totalTokens: data.totalTokens,
      },
      update: {
        endedAt: data.endedAt,
        messageCount: data.messageCount,
        totalTokens: data.totalTokens,
      },
    });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('[POST /api/chat-sessions] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upsert session',
      },
      { status: 500 }
    );
  }
}
