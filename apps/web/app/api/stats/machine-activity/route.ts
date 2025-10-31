/**
 * Machine Activity Stats API
 * 
 * GET /api/stats/machine-activity
 * Returns aggregated activity statistics by machine
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const QuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const query = QuerySchema.parse(searchParams);
    
    const prisma = new PrismaClient();
    
    try {
      // Aggregate activity by machine
      const machines = await prisma.machine.findMany({
        where: query.projectId ? {
          workspaces: {
            some: {
              projectId: query.projectId,
            },
          },
        } : undefined,
        include: {
          workspaces: {
            where: query.projectId ? {
              projectId: query.projectId,
            } : undefined,
            include: {
              chatSessions: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });
      
      // Get event counts for each machine
      const machineActivity = await Promise.all(
        machines.map(async (machine) => {
          const workspaceIds = machine.workspaces.map(w => w.id);
          
          const eventCount = await prisma.agentEvent.count({
            where: {
              chatSession: {
                workspaceId: {
                  in: workspaceIds,
                },
              },
            },
          });
          
          const sessionCount = machine.workspaces.reduce(
            (sum, w) => sum + w.chatSessions.length,
            0
          );
          
          return {
            hostname: machine.hostname,
            machineType: machine.machineType,
            sessionCount,
            eventCount,
            workspaceCount: machine.workspaces.length,
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        data: machineActivity,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('[API] Machine activity error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid query parameters',
            details: error.errors,
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
