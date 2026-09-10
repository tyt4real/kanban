import { Router } from 'itty-router';
import { TaskService } from '../services/tasks';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '../types/tasks';
import { Database } from '../db/client';
import { BoardService } from '../services/boards';
import { WebhookService } from '../services/webhooks';
import { NotificationService } from '../services/notifications';

const webhookConfig = {
  url: '',
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000],
};

const router = Router();

router.get('/boards/:boardId/tasks', async (request, env, ctx) => {
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
  const board = await boardService.getBoardWithColumns(request.params.boardId, authContext.user.sub);
  if (!board) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const taskService = new TaskService(
    env.DB as unknown as Database,
    new WebhookService(env.DB as unknown as Database, { 
      url: env.HERMES_WEBHOOK_URL || '', 
      maxRetries: 3, 
      retryDelays: [1000, 2000, 4000] 
    }),
    new NotificationService(env.DB as unknown as Database)
  );

  const url = new URL(request.url);
  const filters = {
    columnId: url.searchParams.get('columnId') || undefined,
    categoryId: url.searchParams.get('categoryId') || undefined,
    search: url.searchParams.get('search') || undefined,
    limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
  };

  const tasks = await taskService.getTasks(request.params.boardId, filters);

  // Get webhook status for each task
  const webhookService = new WebhookService(env.DB as unknown as Database, { 
    url: env.HERMES_WEBHOOK_URL || '', 
    maxRetries: 3, 
    retryDelays: [1000, 2000, 4000] 
  });
  for (const task of tasks) {
    const delivery = await webhookService.getDeliveryStatus(task.id);
    if (delivery) {
      (task as any).webhook_status = delivery.status;
    }
  }

  const response = new Response(JSON.stringify({ data: tasks }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.post('/tasks', async (request, env, ctx) => {
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
  const body = await request.json() as CreateTaskInput;

  const board = await boardService.getBoardWithColumns(body.boardId, authContext.user.sub);
  if (!board) {
    throw new ApiError('NOT_FOUND', 'Board not found');
  }

  const taskService = new TaskService(
    env.DB as unknown as Database,
    new WebhookService(env.DB as unknown as Database, { 
      url: env.HERMES_WEBHOOK_URL || '', 
      maxRetries: 3, 
      retryDelays: [1000, 2000, 4000] 
    }),
    new NotificationService(env.DB as unknown as Database)
  );

  const task = await taskService.createTask(body);

  const response = new Response(JSON.stringify({ data: task }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.patch('/tasks/:id', async (request, env, ctx) => {
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
  const body = await request.json() as UpdateTaskInput;

  // Get task to verify board ownership
  const taskService = new TaskService(
    env.DB as unknown as Database,
    new WebhookService(env.DB as unknown as Database, { 
      url: env.HERMES_WEBHOOK_URL || '', 
      maxRetries: 3, 
      retryDelays: [1000, 2000, 4000] 
    }),
    new NotificationService(env.DB as unknown as Database)
  );

  const existingTask = await taskService.getTaskWithCategory(request.params.id);
  if (!existingTask) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const board = await boardService.getBoardWithColumns(existingTask.board_id, authContext.user.sub);
  if (!board) {
    throw new ApiError('FORBIDDEN', 'Access denied');
  }

  const task = await taskService.updateTask(request.params.id, body);

  if (!task) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const response = new Response(JSON.stringify({ data: task }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.patch('/tasks/move', async (request, env, ctx) => {
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
  const body = await request.json() as MoveTaskInput;

  // Get task to verify board ownership
  const taskService = new TaskService(
    env.DB as unknown as Database,
    new WebhookService(env.DB as unknown as Database, { 
      url: env.HERMES_WEBHOOK_URL || '', 
      maxRetries: 3, 
      retryDelays: [1000, 2000, 4000] 
    }),
    new NotificationService(env.DB as unknown as Database)
  );

  const existingTask = await taskService.getTaskWithCategory(body.taskId);
  if (!existingTask) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const board = await boardService.getBoardWithColumns(existingTask.board_id, authContext.user.sub);
  if (!board) {
    throw new ApiError('FORBIDDEN', 'Access denied');
  }

  // Verify column belongs to board
  const column = board.columns.find(c => c.id === body.columnId);
  if (!column) {
    throw new ApiError('NOT_FOUND', 'Column not found in this board');
  }

  const task = await taskService.moveTask(body);

  if (!task) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const response = new Response(JSON.stringify({ data: task }), {
    headers: { 'Content-Type': 'application/json' },
  });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

router.delete('/tasks/:id', async (request, env, ctx) => {
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
  const taskService = new TaskService(
    env.DB as unknown as Database,
    new WebhookService(env.DB as unknown as Database, { 
      url: env.HERMES_WEBHOOK_URL || '', 
      maxRetries: 3, 
      retryDelays: [1000, 2000, 4000] 
    }),
    new NotificationService(env.DB as unknown as Database)
  );

  const existingTask = await taskService.getTaskWithCategory(request.params.id);
  if (!existingTask) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const board = await boardService.getBoardWithColumns(existingTask.board_id, authContext.user.sub);
  if (!board) {
    throw new ApiError('FORBIDDEN', 'Access denied');
  }

  const deleted = await taskService.deleteTask(request.params.id);
  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'Task not found');
  }

  const response = new Response(null, { status: 204 });
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);
  return response;
});

export default router;