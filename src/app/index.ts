import { Router } from 'itty-router';
import { createDbClient } from './db/client';
import { AuthService } from './services/auth';
import { BoardService } from './services/boards';
import { CategoryService } from './services/categories';
import { TaskService } from './services/tasks';
import { WebhookService } from './services/webhooks';
import { NotificationService } from './services/notifications';
import { SettingsService } from './services/settings';
import { authMiddleware } from './middleware/auth';
import { RateLimiter, getClientIdentifier } from './middleware/rateLimit';
import { handleCors, addCorsHeaders } from './middleware/cors';
import { handleError, asyncHandler } from './middleware/error';
import authRoutes from './routes/auth';
import boardRoutes from './routes/boards';
import taskRoutes from './routes/tasks';
import categoryRoutes from './routes/categories';
import webhookRoutes from './routes/webhooks';
import settingsRoutes from './routes/settings';
import { KVNamespace, ExecutionContext } from '@cloudflare/workers-types';

interface Env {
  DB: any;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
  HERMES_WEBHOOK_URL: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  ENVIRONMENT: string;
}

// Initialize rate limiter at top level
const rateLimiter = new RateLimiter({} as KVNamespace, {
  authLimit: 5,
  apiLimit: 60,
  webhookLimit: 10,
});

// We'll re-initialize with actual KV in the request handler
let requestRateLimiter: RateLimiter | null = null;

const router = Router();

router.all('*', async (request, env: Env, ctx: ExecutionContext) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Initialize services
  const db = createDbClient(env.DB);
  const authService = new AuthService(db, env.JWT_SECRET);

  // Initialize rate limiter with actual KV
  requestRateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });

  // Apply auth middleware for protected routes
  const protectedPaths = ['/api/boards', '/api/tasks', '/api/categories', '/api/webhooks', '/api/settings', '/api/auth/me', '/api/auth/refresh', '/api/auth/change-password'];
  const isProtected = protectedPaths.some(path => request.url.includes(path));

  if (isProtected && !request.url.includes('/api/auth/login') && !request.url.includes('/api/auth/register')) {
    const authContext = await authMiddleware(request, env, authService);
    if (authContext instanceof Response) {
      return addCorsHeaders(authContext, request.headers.get('Origin') || undefined);
    }
    (request as any).authContext = authContext;
  }

  // Initialize other services
  const boardService = new BoardService(db);
  const categoryService = new CategoryService(db);
  const webhookService = new WebhookService(db, { 
    url: env.HERMES_WEBHOOK_URL,
    maxRetries: 3,
    retryDelays: [1000, 2000, 4000]
  });
  const notificationService = new NotificationService(db);
  await notificationService.initialize();
  const settingsService = new SettingsService(db);
  const taskService = new TaskService(db, webhookService, notificationService);

  // Attach services to request for routes to use
  (request as any).services = {
    db,
    authService,
    boardService,
    categoryService,
    taskService,
    webhookService,
    notificationService,
    settingsService,
    rateLimiter: requestRateLimiter,
  };

  // Rate limiting for all API routes
  if (request.url.includes('/api/')) {
    const identifier = getClientIdentifier(request);
    let limitInfo;
    if (request.url.includes('/api/auth/')) {
      limitInfo = await requestRateLimiter!.checkAuthLimit(identifier);
    } else if (request.url.includes('/api/webhooks/')) {
      limitInfo = await requestRateLimiter!.checkWebhookLimit(identifier);
    } else {
      limitInfo = await requestRateLimiter!.checkApiLimit(identifier);
    }

    if (limitInfo.remaining === 0) {
      return addCorsHeaders(requestRateLimiter!.createRateLimitResponse(limitInfo), request.headers.get('Origin') || undefined);
    }

    // Store rate limit info for response headers
    (request as any).rateLimitInfo = limitInfo;
  }

  return router.handle(request, env);
});

// Mount routes
router.mount('/api/auth', authRoutes);
router.mount('/api/boards', boardRoutes);
router.mount('/api/tasks', taskRoutes);
router.mount('/api/categories', categoryRoutes);
router.mount('/api/webhooks', webhookRoutes);
router.mount('/api/settings', settingsRoutes);

// Health check
router.get('/health', () => new Response(JSON.stringify({ status: 'ok' }), {
  headers: { 'Content-Type': 'application/json' },
}));

// 404 handler
router.all('*', () => new Response(JSON.stringify({
  error: { code: 'NOT_FOUND', message: 'Route not found' }
}), {
  status: 404,
  headers: { 'Content-Type': 'application/json' },
}));

export default {
  fetch: asyncHandler(async (request: Request, env: Env, ctx: ExecutionContext) => {
    try {
      const response = await router.handle(request, env);

      // Add rate limit headers if available
      const rateLimitInfo = (request as any).rateLimitInfo;
      if (rateLimitInfo && requestRateLimiter) {
        requestRateLimiter.addRateLimitHeaders(response.headers, rateLimitInfo);
      }

      // Add CORS headers
      return addCorsHeaders(response, request.headers.get('Origin') || undefined);
    } catch (error) {
      return addCorsHeaders(handleError(error), request.headers.get('Origin') || undefined);
    }
  }),
};