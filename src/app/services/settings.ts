import { Database } from '../db/client';
import { RateLimitConfig, DEFAULT_RATE_LIMITS, SETTINGS_KEYS } from '../types/settings';

export class SettingsService {
  constructor(private db: Database) {}

  async getRateLimits(): Promise<RateLimitConfig> {
    const settings = await this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).bind(SETTINGS_KEYS.RATE_LIMITS).first<{ value: string }>();

    if (settings) {
      return JSON.parse(settings.value);
    }

    return DEFAULT_RATE_LIMITS;
  }

  async updateRateLimits(config: RateLimitConfig): Promise<void> {
    await this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).bind(SETTINGS_KEYS.RATE_LIMITS, JSON.stringify(config), new Date().toISOString()).run();
  }

  async getAllSettings(): Promise<{
    rateLimits: RateLimitConfig;
  }> {
    return {
      rateLimits: await this.getRateLimits(),
    };
  }
}