import { Router } from 'itty-router';
import { BoardService } from '../services/boards';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { CreateBoardInput, UpdateBoardInput, CreateColumnInput, UpdateColumnInput } from '../types/boards';
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const boards = await boardService.getBoards(authContext.user.sub);

  const response = new Response(JSON.stringify({ data: boards }), {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const body = await request.json() as CreateBoardInput;
  const board = await boardService.createBoard(authContext.user.sub, body);

  const response = new Response(JSON.stringify({ data: board }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.get('/:id', async (request, env, ctx) => {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const board = await boardService.getBoardWithColumns(request.params.id, authContext.user.sub);

  if (!board) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const response = new Response(JSON.stringify({ data: board }), {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const body = await request.json() as UpdateBoardInput;
  const board = await boardService.updateBoard(request.params.id, authContext.user.sub, body);

  if (!board) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const response = new Response(JSON.stringify({ data: board }), {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const deleted = await boardService.deleteBoard(request.params.id, authContext.user.sub);

  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const response = new Response(null, { status: 204 });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

// Column routes
router.post('/:boardId/columns', async (request, env, ctx) => {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const body = await request.json() as CreateColumnInput;

  // Verify board ownership
  const board = await boardService.getBoardWithColumns(request.params.boardId, authContext.user.sub);
  if (!board) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const column = await boardService.createColumn({ ...body, boardId: request.params.boardId });

  const response = new Response(JSON.stringify({ data: column }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.patch('/columns/:id', async (request, env, ctx) => {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const body = await request.json() as UpdateColumnInput;
  const column = await boardService.updateColumn(request.params.id, body);

  if (!column) {
    throw new ApiError('NOT_FOUND', 'Column not found');
  }

  const response = new Response(JSON.stringify({ data: column }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.delete('/columns/:id', async (request, env, ctx) => {
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

  const boardService = new BoardService(env.DB as unknown as Database);
  const deleted = await boardService.deleteColumn(request.params.id);

  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'Column not found');
  }

  const response = new Response(null, { status: 204 });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

export default router;