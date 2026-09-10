export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8787',
    'https://*.pages.dev',
  ];

  const allowOrigin = origin && allowedOrigins.some(o => {
    if (o.includes('*')) {
      const pattern = o.replace('*', '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return o === origin;
  }) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request.headers.get('Origin') || undefined),
    });
  }
  return null;
}

export function addCorsHeaders(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}