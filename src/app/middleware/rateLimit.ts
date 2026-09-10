import { KVNamespace } from '@cloudflare/workers-types';
import { RateLimitConfig } from '../types/settings';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}

  private getKey(identifier: string, endpoint: string): string {
    return `ratelimit:${endpoint}:${identifier}`;
  }

  private getWindowMs(limit: number): number {
    return 60 * 1000; // 1 minute window
  }

  async checkLimit(identifier: string, endpoint: string, limit: number): Promise<RateLimitInfo> {
    const key = this.getKey(identifier, endpoint);
    const windowMs = this.getWindowMs(limit);
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const reset = windowStart + windowMs;

    const current = await this.kv.get(key, { type: 'json' }) as { count: number; windowStart: number } | null;

    let count = 0;
    if (current && current.windowStart === windowStart) {
      count = current.count;
    }

    if (count >= limit) {
      return {
        limit,
        remaining: 0,
        reset: Math.ceil(reset / 1000),
      };
    }

    count++;
    await this.kv.put(key, JSON.stringify({ count, windowStart }), {
      expirationTtl: Math.ceil(windowMs / 1000) + 10,
    });

    return {
      limit,
      remaining: Math.max(0, limit - count),
      reset: Math.ceil(reset / 1000),
    };
  }

  async checkAuthLimit(identifier: string): Promise<RateLimitInfo> {
    return this.checkLimit(identifier, 'auth', this.config.authLimit);
  }

  async checkApiLimit(identifier: string): Promise<RateLimitInfo> {
    return this.checkLimit(identifier, 'api', this.config.apiLimit);
  }

  async checkWebhookLimit(identifier: string): Promise<RateLimitInfo> {
    return this.checkLimit(identifier, 'webhook', this.config.webhookLimit);
  }

  addRateLimitHeaders(headers: Headers, info: RateLimitInfo): void {
    headers.set('X-RateLimit-Limit', info.limit.toString());
    headers.set('X-RateLimit-Remaining', info.remaining.toString());
    headers.set('X-RateLimit-Reset', info.reset.toString());
  }

  createRateLimitResponse(info: RateLimitInfo): Response {
    return new Response(JSON.stringify({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter: info.reset - Math.floor(Date.now() / 1000),
      }
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': info.reset.toString(),
        'Retry-After': (info.reset - Math.floor(Date.now() / 1000)).toString(),
      },
    });
  }
}

export function getClientIdentifier(request: Request): string {
  // Try to get user ID from auth context first
  const authContext = (request as any).authContext;
  if (authContext?.user?.sub) {
    return `user:${authContext.user.sub}`;
  }

  // Fall back to IP address
  const cfConnectingIp = request.headers.get('CF-Connecting-IP');
  const forwardedFor = request.headers.get('X-Forwarded-For');
  const ip = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}