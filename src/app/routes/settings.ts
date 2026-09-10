import { Router } from 'itty-router';
import { SettingsService } from '../services/settings';
import { NotificationService } from '../services/notifications';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { SmtpConfig, RateLimitConfig } from '../types/settings';
import { Database } from '../db/client';

const router = Router();

router.get('/', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const authContext = await authMiddleware(request, env, new (await import('../services/auth')).AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkApiLimit(identifier);
  if (limitInfo.remaining === 0) return rateLimiter.createRateLimitResponse(limitInfo);

  const settingsService = new SettingsService(env.DB as unknown as Database);
  const notificationService = new NotificationService(env.DB as unknown as Database);

  const settings = await settingsService.getAllSettings();
  const smtpConfig = await notificationService.getConfig();

  const response = new Response(JSON.stringify({
    data: {
      categories: [], // Will be fetched from categories endpoint
      smtp: smtpConfig ? { host: smtpConfig.host, port: smtpConfig.port, user: smtpConfig.user, from: smtpConfig.from } : null,
      rateLimits: settings.rateLimits,
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.put('/smtp', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const authContext = await authMiddleware(request, env, new (await import('../services/auth')).AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkApiLimit(identifier);
  if (limitInfo.remaining === 0) return rateLimiter.createRateLimitResponse(limitInfo);

  const notificationService = new NotificationService(env.DB as unknown as Database);
  const body = await request.json() as SmtpConfig;

  await notificationService.updateConfig(body);

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.post('/smtp/test', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const authContext = await authMiddleware(request, env, new (await import('../services/auth')).AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkApiLimit(identifier);
  if (limitInfo.remaining === 0) return rateLimiter.createRateLimitResponse(limitInfo);

  const notificationService = new NotificationService(env.DB as unknown as Database);
  const body = await request.json() as { email: string };

  if (!body.email) {
    throw new ApiError('VALIDATION_ERROR', 'Email is required');
  }

  const result = await notificationService.sendTestEmail(body.email);

  const response = new Response(JSON.stringify({ data: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.put('/rate-limits', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const authContext = await authMiddleware(request, env, new (await import('../services/auth')).AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkApiLimit(identifier);
  if (limitInfo.remaining === 0) return rateLimiter.createRateLimitResponse(limitInfo);

  const settingsService = new SettingsService(env.DB as unknown as Database);
  const body = await request.json() as RateLimitConfig;

  await settingsService.updateRateLimits(body);

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

export default router;