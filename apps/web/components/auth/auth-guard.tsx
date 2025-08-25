/**
 * Auth guard component to protect routes
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

export function AuthGuard({ 
  children, 
  redirectTo = '/login',
  requireEmailVerification = false 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      if (requireEmailVerification && !user.isEmailVerified) {
        router.push('/verify-email');
        return;
      }
    }
  }, [user, loading, router, redirectTo, requireEmailVerification]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (requireEmailVerification && !user.isEmailVerified) {
    return null; // Will redirect to email verification
  }

  return <>{children}</>;
}

// Wrapper for pages that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    requireEmailVerification?: boolean;
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}