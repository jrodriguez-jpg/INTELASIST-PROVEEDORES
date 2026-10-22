import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constantTimeEqual, createSessionToken, verifySessionToken } from './auth.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = resolve(ROOT, 'dist');
const BODY_LIMIT = 1024 * 1024;
const ROLES = new Set(['operador', 'inspector', 'hogar']);
const PROVINCES = new Set([
  'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién', 'Herrera',
  'Los Santos', 'Panamá Centro', 'Panamá Norte', 'Panamá Este', 'Panamá Oeste', 'Veraguas',
]);
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function loadLocalEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadLocalEnv();

const config = {
  accessCodeViewer: process.env.VIEWER_ACCESS_CODE,
  accessCodeAdmin: process.env.ADMIN_ACCESS_CODE,
  sessionSecret: process.env.SESSION_SECRET,
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  allowedOrigins: (process.env.APP_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

function validateConfig() {
  const missing = Object.entries({
    VIEWER_ACCESS_CODE: config.accessCodeViewer,
    ADMIN_ACCESS_CODE: config.accessCodeAdmin,
    SESSION_SECRET: config.sessionSecret,
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceKey,
  }).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  if (constantTimeEqual(config.accessCodeViewer, config.accessCodeAdmin)) {
    throw new Error('VIEWER_ACCESS_CODE and ADMIN_ACCESS_CODE must be different.');
  }
  if (config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  config.supabaseUrl = config.supabaseUrl.replace(/\/+$/, '');
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function requestIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim().slice(0, 100)
    : request.socket.remoteAddress || 'unknown';
}

function checkLoginLimit(ip, now = Date.now()) {
  const previous = loginAttempts.get(ip);
  if (previous && now - previous.startedAt < LOGIN_WINDOW_MS && previous.count >= LOGIN_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
  }
  if (!previous || now - previous.startedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { startedAt: now, count: 1 });
  } else {
    previous.count += 1;
  }
  if (loginAttempts.size > 10_000) {
    for (const [key, value] of loginAttempts) {
      if (now - value.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(key);
    }
  }
}

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new HttpError(413, 'La solicitud es demasiado grande.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Expected a JSON object.');
    }
    return value;
  } catch {
    throw new HttpError(400, 'El contenido de la solicitud no es válido.');
  }
}

function setCors(request, response) {
  const origin = request.headers.origin;
  if (!origin) return;
  const requestHost = request.headers.host;
  const protocol = request.headers['x-forwarded-proto']?.split(',')[0].trim()
    || (request.socket.encrypted ? 'https' : 'http');
  const sameOrigin = requestHost && origin === `${protocol}://${requestHost}`;
  const allowed = sameOrigin || config.allowedOrigins.includes(origin);
  if (!allowed) throw new HttpError(403, 'Origen no permitido.');
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
}

function getSession(request) {
  const authorization = request.headers.authorization;
  const match = typeof authorization === 'string' && authorization.match(/^Bearer\s+(.+)$/i);
  const session = match && verifySessionToken(match[1], config.sessionSecret);
  if (!session) throw new HttpError(401, 'La sesión no es válida o ha vencido. Inicia sesión de nuevo.');
  return session;
}

function requireAdmin(request) {
  const session = getSession(request);
  if (session.role !== 'admin') throw new HttpError(403, 'Se requiere acceso de administrador.');
  return session;
}

function validateProvider(data, partial = false) {
  const fields = ['nombre', 'empresa', 'rol', 'provincias', 'telefono', 'correo', 'zona', 'notas'];
  const result = {};
  for (const field of fields) {
    if (!Object.hasOwn(data, field)) continue;
    const value = data[field];
    if (field === 'rol') {
      if (!Array.isArray(value) || value.length < 1 || value.length > ROLES.size
        || value.some((role) => !ROLES.has(role))) {
        throw new HttpError(400, 'Los roles no son válidos.');
      }
      result.rol = [...new Set(value)];
      continue;
    }
    if (field === 'provincias') {
      if (!Array.isArray(value) || value.length < 1 || value.length > PROVINCES.size
        || value.some((province) => !PROVINCES.has(province))) {
        throw new HttpError(400, 'Las provincias no son válidas.');
      }
      result.provincias = [...new Set(value)];
      continue;
    }
    const maxLength = field === 'notas' ? 2000 : field === 'correo' ? 254 : 200;
    if (value !== null && (typeof value !== 'string' || value.length > maxLength)) {
      throw new HttpError(400, `El campo ${field} no es válido.`);
    }
    if (field === 'nombre' && (typeof value !== 'string' || !value.trim())) {
      throw new HttpError(400, 'El nombre es obligatorio.');
    }
    result[field] = typeof value === 'string' ? value.trim() : value;
  }
  if (!partial && (!result.nombre || !result.rol || !result.provincias)) {
    throw new HttpError(400, 'Faltan nombre, rol o provincia.');
  }
  if (partial && Object.keys(result).length === 0) {
    throw new HttpError(400, 'No hay datos para actualizar.');
  }
  return result;
}

async function supabaseRequest(method, suffix, body) {
  const headers = {
    apikey: config.supabaseServiceKey,
    Authorization: `Bearer ${config.supabaseServiceKey}`,
    Prefer: 'return=representation',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${config.supabaseUrl}/rest/v1/proveedores${suffix}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();
  if (!response.ok) {
    console.error(`Supabase ${method} failed (${response.status}): ${responseText}`);
    throw new HttpError(502, 'No se pudo guardar el cambio en el directorio.');
  }
  return responseText ? JSON.parse(responseText) : null;
}

async function handleApi(request, response, url) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/session') {
    checkLoginLimit(requestIp(request));
    const body = await readJson(request);
    if (typeof body.code !== 'string' || body.code.length > 256) {
      throw new HttpError(401, 'Código incorrecto.');
    }
    const isAdmin = constantTimeEqual(body.code, config.accessCodeAdmin);
    const isViewer = constantTimeEqual(body.code, config.accessCodeViewer);
    if (!isAdmin && !isViewer) throw new HttpError(401, 'Código incorrecto.');
    const role = isAdmin ? 'admin' : 'viewer';
    const token = createSessionToken(role, config.sessionSecret);
    return sendJson(response, 200, { token, role });
  }

  if (request.method === 'GET' && url.pathname === '/api/session') {
    const session = getSession(request);
    return sendJson(response, 200, { role: session.role, expiresAt: session.expiresAt });
  }

  if (url.pathname === '/api/proveedores' && request.method === 'POST') {
    requireAdmin(request);
    const provider = validateProvider(await readJson(request));
    const result = await supabaseRequest('POST', '', provider);
    return sendJson(response, 201, result);
  }

  const providerMatch = url.pathname.match(/^\/api\/proveedores\/([0-9a-f-]{36})$/i);
  if (providerMatch && request.method === 'PATCH') {
    requireAdmin(request);
    const provider = validateProvider(await readJson(request), true);
    const result = await supabaseRequest(
      'PATCH',
      `?id=eq.${encodeURIComponent(providerMatch[1])}`,
      provider,
    );
    if (!Array.isArray(result) || result.length === 0) {
      throw new HttpError(404, 'No se encontró el contacto.');
    }
    return sendJson(response, 200, result[0]);
  }

  if (providerMatch && request.method === 'DELETE') {
    requireAdmin(request);
    const result = await supabaseRequest(
      'DELETE',
      `?id=eq.${encodeURIComponent(providerMatch[1])}`,
    );
    return sendJson(response, 200, { deleted: Array.isArray(result) ? result.length : 0 });
  }

  throw new HttpError(404, 'Ruta no encontrada.');
}

function serveStatic(request, response, pathname) {
  if (!existsSync(DIST)) {
    return sendJson(response, 503, { error: 'La aplicación todavía no se ha compilado.' });
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'Ruta no válida.');
  }
  const requestedFile = resolve(DIST, `.${decodedPath}`);
  if (requestedFile !== DIST && !requestedFile.startsWith(`${DIST}${sep}`)) {
    throw new HttpError(403, 'Ruta no permitida.');
  }
  const isAsset = extname(requestedFile) !== '';
  const filePath = existsSync(requestedFile) && statSync(requestedFile).isFile()
    ? requestedFile
    : isAsset ? null : resolve(DIST, 'index.html');
  if (!filePath || !existsSync(filePath)) throw new HttpError(404, 'Archivo no encontrado.');
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  createReadStream(filePath).pipe(response);
}

validateConfig();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      setCors(request, response);
      return await handleApi(request, response, url);
    }
    if (url.pathname === '/api') {
      setCors(request, response);
      throw new HttpError(404, 'Ruta no encontrada.');
    }
    return serveStatic(request, response, url.pathname);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error('Request failed:', error);
    if (!response.headersSent) sendJson(response, status, {
      error: error instanceof HttpError ? error.message : 'Ocurrió un error interno.',
    });
    else response.destroy();
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`INTELASIST server listening on port ${port}`);
});
