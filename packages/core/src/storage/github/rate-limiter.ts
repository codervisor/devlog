/**
 * Rate limiter for GitHub API requests
 */

import { GitHubStorageConfig } from '@/types';

export class RateLimiter {
  private requestsPerHour: number;
  private retryDelay: number;
  private maxRetries: number;
  private requestTimes: number[] = [];

  constructor(config: GitHubStorageConfig['rateLimit']) {
    this.requestsPerHour = config?.requestsPerHour || 5000;
    this.retryDelay = config?.retryDelay || 1000;
    this.maxRetries = config?.maxRetries || 3;
  }

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitIfNeeded();

    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        this.recordRequest();
        return await fn();
      } catch (error) {
        if (this.isRateLimitError(error)) {
          attempts++;
          if (attempts >= this.maxRetries) {
            throw new Error(`Rate limit exceeded after ${this.maxRetries} attempts`);
          }
          await this.delay(this.retryDelay * Math.pow(2, attempts));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Remove old requests
    this.requestTimes = this.requestTimes.filter((time) => time > oneHourAgo);

    if (this.requestTimes.length >= this.requestsPerHour) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = oldestRequest + 60 * 60 * 1000 - now;
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }
  }

  private recordRequest(): void {
    this.requestTimes.push(Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRateLimitError(error: any): boolean {
    return (
      error.status === 403 &&
      (error.message.includes('rate limit') || error.message.includes('API rate limit'))
    );
  }
}
