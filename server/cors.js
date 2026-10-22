export function readAllowedOrigins(environment) {
  const configuredOrigins = [
    environment.ALLOWED_ORIGIN,
    ...(environment.APP_ORIGINS || '').split(','),
  ].map((origin) => origin?.trim()).filter(Boolean);
  const allowedOrigins = new Set();

  for (const value of configuredOrigins) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('ALLOWED_ORIGIN and APP_ORIGINS must contain valid origins.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) {
      throw new Error('ALLOWED_ORIGIN and APP_ORIGINS must contain origins only, without paths.');
    }
    allowedOrigins.add(url.origin);
  }

  return allowedOrigins;
}

export function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const requestHost = request.headers.host;
  const protocol = request.headers['x-forwarded-proto']?.split(',')[0].trim()
    || (request.socket?.encrypted ? 'https' : 'http');
  const sameOrigin = requestHost && origin === `${protocol}://${requestHost}`;
  if (!sameOrigin && !allowedOrigins.has(origin)) return false;

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  return true;
}
