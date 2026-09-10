import { AuthService } from '../services/auth';
import { JWTPayload } from '../types/auth';

export interface AuthContext {
  user: JWTPayload;
}

export async function authMiddleware(
  request: Request,
  env: { JWT_SECRET: string },
  authService: AuthService
): Promise<AuthContext | Response> {
  const cookieHeader = request.headers.get('Cookie');
  const accessToken = authService.extractTokenFromCookie(cookieHeader, 'access_token');

  if (!accessToken) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await authService.verifyAccessToken(accessToken);
  if (!payload) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { user: payload };
}

export function getAuthContext(request: Request): AuthContext | null {
  // This is used in route handlers after middleware has validated
  return (request as any).authContext || null;
}