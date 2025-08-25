/**
 * SSO Service
 * Handles OAuth flows for GitHub, Google, and WeChat
 */

import 'reflect-metadata';
import type { SSOConfig, SSOProvider, SSOUserInfo } from '../types/index.js';

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface OAuthUserInfo {
  id: string | number;
  email: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
  login?: string;
  nickname?: string;
  headimgurl?: string;
}

export class SSOService {
  private static instance: SSOService | null = null;
  private config: SSOConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SSOService {
    if (!SSOService.instance) {
      SSOService.instance = new SSOService();
    }
    return SSOService.instance;
  }

  /**
   * Load SSO configuration from environment variables
   */
  private loadConfig(): SSOConfig {
    const config: SSOConfig = {};

    // GitHub configuration
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      config.github = {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/github',
      };
    }

    // Google configuration
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      config.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
      };
    }

    // WeChat configuration
    if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
      config.wechat = {
        appId: process.env.WECHAT_APP_ID,
        appSecret: process.env.WECHAT_APP_SECRET,
        redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/wechat',
      };
    }

    return config;
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  getAuthorizationUrl(provider: SSOProvider, state?: string): string {
    switch (provider) {
      case 'github':
        return this.getGitHubAuthUrl(state);
      case 'google':
        return this.getGoogleAuthUrl(state);
      case 'wechat':
        return this.getWeChatAuthUrl(state);
      default:
        throw new Error(`Unsupported SSO provider: ${provider}`);
    }
  }

  /**
   * Exchange authorization code for access token and user info
   */
  async exchangeCodeForUser(provider: SSOProvider, code: string, state?: string): Promise<SSOUserInfo> {
    switch (provider) {
      case 'github':
        return this.exchangeGitHubCode(code);
      case 'google':
        return this.exchangeGoogleCode(code);
      case 'wechat':
        return this.exchangeWeChatCode(code);
      default:
        throw new Error(`Unsupported SSO provider: ${provider}`);
    }
  }

  /**
   * Get available SSO providers
   */
  getAvailableProviders(): SSOProvider[] {
    const providers: SSOProvider[] = [];
    if (this.config.github) providers.push('github');
    if (this.config.google) providers.push('google');
    if (this.config.wechat) providers.push('wechat');
    return providers;
  }

  // GitHub OAuth implementation
  private getGitHubAuthUrl(state?: string): string {
    if (!this.config.github) {
      throw new Error('GitHub SSO not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.github.clientId,
      redirect_uri: this.config.github.redirectUri,
      scope: 'user:email',
      ...(state && { state }),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private async exchangeGitHubCode(code: string): Promise<SSOUserInfo> {
    if (!this.config.github) {
      throw new Error('GitHub SSO not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.github.clientId,
        client_secret: this.config.github.clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange GitHub code for token');
    }

    const tokenData = await tokenResponse.json() as OAuthTokenResponse;

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }

    const userData = await userResponse.json() as OAuthUserInfo;

    // Get user email if not public
    let email = userData.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json() as Array<{ email: string; primary: boolean }>;
        const primaryEmail = emails.find((e) => e.primary) || emails[0];
        email = primaryEmail?.email;
      }
    }

    if (!email) {
      throw new Error('No email address found in GitHub account');
    }

    return {
      provider: 'github',
      providerId: userData.id.toString(),
      email,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
    };
  }

  // Google OAuth implementation
  private getGoogleAuthUrl(state?: string): string {
    if (!this.config.google) {
      throw new Error('Google SSO not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async exchangeGoogleCode(code: string): Promise<SSOUserInfo> {
    if (!this.config.google) {
      throw new Error('Google SSO not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.google.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Google code for token');
    }

    const tokenData = await tokenResponse.json() as OAuthTokenResponse;

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const userData = await userResponse.json() as OAuthUserInfo;

    return {
      provider: 'google',
      providerId: userData.id.toString(),
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.picture,
    };
  }

  // WeChat OAuth implementation
  private getWeChatAuthUrl(state?: string): string {
    if (!this.config.wechat) {
      throw new Error('WeChat SSO not configured');
    }

    const params = new URLSearchParams({
      appid: this.config.wechat.appId,
      redirect_uri: encodeURIComponent(this.config.wechat.redirectUri),
      response_type: 'code',
      scope: 'snsapi_userinfo',
      ...(state && { state }),
    });

    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }

  private async exchangeWeChatCode(code: string): Promise<SSOUserInfo> {
    if (!this.config.wechat) {
      throw new Error('WeChat SSO not configured');
    }

    // Exchange code for access token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.config.wechat.appId}&secret=${this.config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
    
    const tokenResponseFetch = await fetch(tokenUrl);

    if (!tokenResponseFetch.ok) {
      throw new Error('Failed to exchange WeChat code for token');
    }

    const tokenData = await tokenResponseFetch.json() as OAuthTokenResponse & { openid?: string };

    if (!tokenData.access_token || !tokenData.openid) {
      throw new Error('Invalid WeChat token response');
    }

    // Get user info
    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=en`;
    const userResponse = await fetch(userUrl);

    if (!userResponse.ok) {
      throw new Error('Failed to fetch WeChat user info');
    }

    const userData = await userResponse.json() as OAuthUserInfo & { openid?: string };

    return {
      provider: 'wechat',
      providerId: userData.openid || userData.id?.toString() || '',
      email: `${userData.openid}@wechat.local`, // WeChat doesn't provide email, use a placeholder
      name: userData.nickname || userData.name,
      avatarUrl: userData.headimgurl,
    };
  }
}