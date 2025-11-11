/**
 * Authentication middleware for API routes
 */

import { NextRequest } from 'next/server';
import type { SessionUser } from '@codervisor/devlog-core';

export interface AuthenticatedRequest extends NextRequest {
  user: SessionUser;
}

/**
 * Middleware to verify JWT tokens and extract user information
 */
export async function withAuth<T>(
  handler: (req: AuthenticatedRequest, ...args: T[]) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: T[]) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Import PrismaAuthService dynamically to avoid initialization issues
      const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
      const authService = PrismaAuthService.getInstance();
      
      const user = await authService.validateToken(token);
      
      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = user;

      return await handler(authenticatedReq, ...args);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

/**
 * Optional authentication middleware - allows both authenticated and unauthenticated requests
 */
export async function withOptionalAuth<T>(
  handler: (req: NextRequest & { user?: SessionUser }, ...args: T[]) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: T[]) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
        const authService = PrismaAuthService.getInstance();
        
        try {
          const user = await authService.validateToken(token);
          (req as any).user = user;
        } catch {
          // Ignore token verification errors for optional auth
        }
      }

      return await handler(req as NextRequest & { user?: SessionUser }, ...args);
    } catch (error) {
      return await handler(req as NextRequest & { user?: SessionUser }, ...args);
    }
  };
}

/**
 * Extract user from authenticated request
 */
export function getUser(req: AuthenticatedRequest): SessionUser {
  return req.user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(req: NextRequest & { user?: SessionUser }): req is AuthenticatedRequest {
  return !!(req as any).user;
}