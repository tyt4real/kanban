import { Router } from 'itty-router';
import { AuthService } from '../services/auth';
import { RateLimiter, getClientIdentifier } from '../middleware/rateLimit';
import { authMiddleware, AuthContext } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../types/auth';
import { Database } from '../db/client';

const router = Router();

router.post('/register', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkAuthLimit(identifier);

  if (limitInfo.remaining === 0) {
    return rateLimiter.createRateLimitResponse(limitInfo);
  }

  const authService = new AuthService(
    env.DB as unknown as Database,
    env.JWT_SECRET
  );

  const body = await request.json() as RegisterInput;
  const user = await authService.register(body);
  const tokens = await authService.generateTokens(user);

  const response = new Response(JSON.stringify({
    data: { id: user.id, email: user.email, created_at: user.created_at }
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

  authService.setAuthCookies(response.headers, tokens);
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);

  return response;
});

router.post('/login', async (request, env, ctx) => {
  const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV, {
    authLimit: 5,
    apiLimit: 60,
    webhookLimit: 10,
  });
  const identifier = getClientIdentifier(request);
  const limitInfo = await rateLimiter.checkAuthLimit(identifier);

  if (limitInfo.remaining === 0) {
    return rateLimiter.createRateLimitResponse(limitInfo);
  }

  const authService = new AuthService(
    env.DB as unknown as Database,
    env.JWT_SECRET
  );

  const body = await request.json() as LoginInput;
  const tokens = await authService.login(body);

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  authService.setAuthCookies(response.headers, tokens);
  rateLimiter.addRateLimitHeaders(response.headers, limitInfo);

  return response;
});

router.post('/logout', async (request, env, ctx) => {
  const authService = new AuthService(
    env.DB as unknown as Database,
    env.JWT_SECRET
  );

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  authService.clearAuthCookies(response.headers);
  return response;
});

router.post('/refresh', async (request, env, ctx) => {
  const authService = new AuthService(
    env.DB as unknown as Database,
    env.JWT_SECRET
  );

  const cookieHeader = request.headers.get('Cookie');
  const refreshToken = authService.extractTokenFromCookie(cookieHeader, 'refresh_token');

  if (!refreshToken) {
    throw new ApiError('UNAUTHORIZED', 'No refresh token');
  }

  const tokens = await authService.refreshTokens(refreshToken);
  if (!tokens) {
    throw new ApiError('UNAUTHORIZED', 'Invalid refresh token');
  }

  const response = new Response(JSON.stringify({ data: { success: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  authService.setAuthCookies(response.headers, tokens);
  return response;
});

router.get('/me', async (request, env, ctx) => {
  const authContext = await authMiddleware(request, env, new AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const authService = new AuthService(env.DB as unknown as Database, env.JWT_SECRET);
  const user = await authService.getUserById(authContext.user.sub);

  if (!user) {
    throw new ApiError('NOT_FOUND', 'User not found');
  }

  return new Response(JSON.stringify({
    data: { id: user.id, email: user.email, created_at: user.created_at }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

router.post('/change-password', async (request, env, ctx) => {
  const authContext = await authMiddleware(request, env, new AuthService(env.DB as unknown as Database, env.JWT_SECRET));
  if (authContext instanceof Response) return authContext;

  const authService = new AuthService(env.DB as unknown as Database, env.JWT_SECRET);
  const body = await request.json() as ChangePasswordInput;

  await authService.changePassword(authContext.user.sub, body);

  return new Response(JSON.stringify({ data: { success: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

export default router;