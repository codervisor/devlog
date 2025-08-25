/**
 * SSO Integration Test
 * Tests the complete SSO workflow without requiring real OAuth providers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SSO Integration', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Store original environment
    originalEnv = {
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      WECHAT_APP_ID: process.env.WECHAT_APP_ID,
      WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET,
    };

    // Clear all SSO environment variables
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.WECHAT_APP_ID;
    delete process.env.WECHAT_APP_SECRET;

    // Clear module cache to force reload
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
    vi.resetModules();
  });

  it('should return empty providers when no SSO is configured', async () => {
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const providers = ssoService.getAvailableProviders();
    expect(providers).toEqual([]);
  });

  it('should detect GitHub when configured', async () => {
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
    
    // Import after setting env vars
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const providers = ssoService.getAvailableProviders();
    expect(providers).toContain('github');
  });

  it('should generate correct GitHub authorization URL', async () => {
    process.env.GITHUB_CLIENT_ID = 'test-github-client';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/github';
    
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const authUrl = ssoService.getAuthorizationUrl('github');
    
    expect(authUrl).toContain('https://github.com/login/oauth/authorize');
    expect(authUrl).toContain('client_id=test-github-client');
    expect(authUrl).toContain('scope=user%3Aemail');
    expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgithub');
  });

  it('should generate correct Google authorization URL', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';
    
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const authUrl = ssoService.getAuthorizationUrl('google');
    
    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain('client_id=test-google-client');
    expect(authUrl).toContain('scope=openid+email+profile');
    expect(authUrl).toContain('response_type=code');
  });

  it('should generate correct WeChat authorization URL', async () => {
    process.env.WECHAT_APP_ID = 'test-wechat-app';
    process.env.WECHAT_APP_SECRET = 'test-wechat-secret';
    process.env.WECHAT_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/wechat';
    
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const authUrl = ssoService.getAuthorizationUrl('wechat');
    
    expect(authUrl).toContain('https://open.weixin.qq.com/connect/qrconnect');
    expect(authUrl).toContain('appid=test-wechat-app');
    expect(authUrl).toContain('scope=snsapi_userinfo');
    expect(authUrl).toContain('response_type=code');
  });

  it('should throw error for unconfigured provider', async () => {
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    expect(() => {
      ssoService.getAuthorizationUrl('github');
    }).toThrow('GitHub SSO not configured');
  });

  it('should throw error for unsupported provider', async () => {
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    expect(() => {
      // @ts-ignore - testing invalid provider
      ssoService.getAuthorizationUrl('invalid');
    }).toThrow('Unsupported SSO provider: invalid');
  });

  it('should exchange GitHub code for user info', async () => {
    process.env.GITHUB_CLIENT_ID = 'test-github-client';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    
    // Mock fetch
    const mockFetch = vi.fn();
    const originalFetch = global.fetch;
    global.fetch = mockFetch;

    // Mock GitHub API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'github-access-token',
          token_type: 'bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 123456,
          login: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg',
        }),
      });
    
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const userInfo = await ssoService.exchangeCodeForUser('github', 'test-code');
    
    expect(userInfo).toEqual({
      provider: 'github',
      providerId: '123456',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://github.com/avatar.jpg',
    });

    // Restore fetch
    global.fetch = originalFetch;
  });

  it('should handle GitHub email not in public profile', async () => {
    process.env.GITHUB_CLIENT_ID = 'test-github-client';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    
    // Mock fetch
    const mockFetch = vi.fn();
    const originalFetch = global.fetch;
    global.fetch = mockFetch;

    // Mock GitHub API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'github-access-token',
          token_type: 'bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 123456,
          login: 'testuser',
          email: null, // No public email
          name: 'Test User',
          avatar_url: 'https://github.com/avatar.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { email: 'test@example.com', primary: true },
          { email: 'other@example.com', primary: false },
        ]),
      });
    
    const { SSOService } = await import('@codervisor/devlog-core/auth');
    const ssoService = SSOService.getInstance();
    
    const userInfo = await ssoService.exchangeCodeForUser('github', 'test-code');
    
    expect(userInfo.email).toBe('test@example.com');

    // Restore fetch
    global.fetch = originalFetch;
  });
});