import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api';

export async function GET() {
  try {
    // Basic health check - could be expanded to check database connectivity
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return createSuccessResponse(healthData);
  } catch (error) {
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return createErrorResponse('HEALTH_CHECK_FAILED', 'Health check failed', {
      status: 500,
      details: errorData,
    });
  }
}
