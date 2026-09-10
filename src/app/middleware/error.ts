export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static validationError(message: string, details?: any): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 422, details);
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(message: string = 'Not found'): ApiError {
    return new ApiError('NOT_FOUND', message, 404);
  }

  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError('CONFLICT', message, 409);
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError('INTERNAL_ERROR', message, 500);
  }

  static rateLimited(retryAfter: number): ApiError {
    const error = new ApiError('RATE_LIMITED', 'Too many requests', 429);
    (error as any).retryAfter = retryAfter;
    return error;
  }
}

export function handleError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if ((error as any).retryAfter) {
      headers['Retry-After'] = ((error as any).retryAfter).toString();
    }
    return new Response(JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      }
    }), { status: error.statusCode, headers });
  }

  if (error instanceof Response) {
    return error;
  }

  return new Response(JSON.stringify({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }
  }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}

export function asyncHandler(
  handler: (request: Request, env: any, ctx: any) => Promise<Response>
) {
  return async (request: Request, env: any, ctx: any): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}