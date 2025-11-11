/**
 * SSO Button Component
 * Handles SSO login for different providers
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import type { SSOProvider } from '@codervisor/devlog-core';

interface SSOButtonProps {
  provider: SSOProvider;
  className?: string;
  disabled?: boolean;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: '🔗', // You can replace with actual GitHub icon
    bgColor: 'bg-gray-900 hover:bg-gray-800',
    textColor: 'text-white',
  },
  google: {
    name: 'Google',
    icon: '🔗', // You can replace with actual Google icon
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-white',
  },
  wechat: {
    name: 'WeChat',
    icon: '💬', // You can replace with actual WeChat icon
    bgColor: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-white',
  },
};

export function SSOButton({ provider, className = '', disabled = false }: SSOButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const config = providerConfig[provider];

  const handleSSOLogin = async () => {
    if (loading || disabled) return;

    setLoading(true);
    setError('');

    try {
      // Get authorization URL from the server
      const response = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate SSO login');
      }

      // Redirect to OAuth provider
      window.location.href = data.data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleSSOLogin}
        disabled={loading || disabled}
        className={`w-full ${config.bgColor} ${config.textColor} ${className}`}
        variant="outline"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <span className="mr-2">{config.icon}</span>
        )}
        Continue with {config.name}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
