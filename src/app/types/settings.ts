export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface RateLimitConfig {
  authLimit: number;
  apiLimit: number;
  webhookLimit: number;
}

export interface Settings {
  smtp: SmtpConfig | null;
  rateLimits: RateLimitConfig;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  authLimit: 5,
  apiLimit: 60,
  webhookLimit: 10,
};

export const SETTINGS_KEYS = {
  SMTP: 'smtp_config',
  RATE_LIMITS: 'rate_limits',
} as const;