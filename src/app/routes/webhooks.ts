import { Router } from 'itty-router';
import { WebhookService } from '../services/webhooks';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { Database } from '../db/client';

const webhookConfig = {
  url: '',
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000],
};

const router = Router();

router.get('/tasks/:taskId', async (request, env, ctx) => {
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

  const webhookService = new WebhookService(env.DB as unknown as Database, { 
    url: env.HERMES_WEBHOOK_URL || '', 
    maxRetries: 3, 
    retryDelays: [1000, 2000, 4000] 
  });
  const delivery = await webhookService.getDeliveryStatus(request.params.taskId);

  const response = new Response(JSON.stringify({ data: delivery }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.post('/retry/:taskId', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const authContext = await authMiddleware(request, env, new (await import('../services/auth')).AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkWebhookLimit(identifier);
  if (limitInfo.remaining === 0) return rateLimiter.createRateLimitResponse(limitInfo);

  const webhookService = new WebhookService(env.DB as unknown as Database, { 
    url: env.HERMES_WEBHOOK_URL || '', 
    maxRetries: 3, 
    retryDelays: [1000, 2000, 4000] 
  });
  const retried = await webhookService.retryDelivery(request.params.taskId);

  if (!retried) {
    throw new ApiError('NOT_FOUND', 'Webhook delivery not found');
  }

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

export default router;