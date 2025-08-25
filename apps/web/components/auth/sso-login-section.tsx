/**
 * SSO Login Section Component
 * Shows available SSO providers and handles SSO login
 */

'use client';

import { useEffect, useState } from 'react';
import { SSOButton } from './sso-button';
import { Separator } from '@/components/ui/separator';
import type { SSOProvider } from '@codervisor/devlog-core';

interface SSOLoginSectionProps {
  className?: string;
}

export function SSOLoginSection({ className = '' }: SSOLoginSectionProps) {
  const [availableProviders, setAvailableProviders] = useState<SSOProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/auth/sso');
        const data = await response.json();

        if (response.ok && data.success) {
          setAvailableProviders(data.data.providers);
        }
      } catch (error) {
        console.error('Failed to fetch SSO providers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (availableProviders.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-3">
        {availableProviders.map((provider) => (
          <SSOButton key={provider} provider={provider} />
        ))}
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}