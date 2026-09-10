import { Router } from 'itty-router';
import { CategoryService } from '../services/categories';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { CreateCategoryInput, UpdateCategoryInput } from '../types/categories';
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

  const categoryService = new CategoryService(env.DB as unknown as Database);
  const categories = await categoryService.getCategories(authContext.user.sub);

  const response = new Response(JSON.stringify({ data: categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.post('/', async (request, env, ctx) => {
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

  const categoryService = new CategoryService(env.DB as unknown as Database);
  const body = await request.json() as CreateCategoryInput;

  // Check if AI agent category already exists
  if (body.isAiAgent) {
    const existing = await categoryService.getAiAgentCategory(authContext.user.sub);
    if (existing) {
      throw new ApiError('CONFLICT', 'AI Agent category already exists');
    }
  }

  const category = await categoryService.createCategory(authContext.user.sub, body);

  const response = new Response(JSON.stringify({ data: category }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.patch('/:id', async (request, env, ctx) => {
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

  const categoryService = new CategoryService(env.DB as unknown as Database);
  const body = await request.json() as UpdateCategoryInput;

  // Check if trying to set AI agent when one already exists
  if (body.isAiAgent) {
    const existing = await categoryService.getAiAgentCategory(authContext.user.sub);
    if (existing && existing.id !== request.params.id) {
      throw new ApiError('CONFLICT', 'AI Agent category already exists');
    }
  }

  const category = await categoryService.updateCategory(request.params.id, body);

  if (!category) {
    throw new ApiError('NOT_FOUND', 'Category not found');
  }

  const response = new Response(JSON.stringify({ data: category }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.delete('/:id', async (request, env, ctx) => {
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

  const categoryService = new CategoryService(env.DB as unknown as Database);
  const category = await categoryService.getCategory(request.params.id);
  
  if (!category) {
    throw new ApiError('NOT_FOUND', 'Category not found');
  }

  // Verify ownership
  if (category.user_id !== authContext.user.sub) {
    throw new ApiError('FORBIDDEN', 'Access denied');
  }

  const deleted = await categoryService.deleteCategory(request.params.id);
  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'Category not found');
  }

  const response = new Response(null, { status: 204 });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

export default router;