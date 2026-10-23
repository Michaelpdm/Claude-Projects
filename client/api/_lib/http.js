import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async route handlers so rejections reach the error middleware.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Signed session tokens (HMAC-SHA256, no external deps) ──
const TTL_MS = 12 * 60 * 60 * 1000;
const b64 = (buf) => Buffer.from(buf).toString('base64url');

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, 'Server is not configured (SESSION_SECRET missing)');
  return s;
}

export function signToken(role) {
  const payload = b64(JSON.stringify({ role, exp: Date.now() + TTL_MS }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// Attaches req.role when a valid Bearer token is present.
export function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  const data = h.startsWith('Bearer ') ? readToken(h.slice(7)) : null;
  req.role = data?.role || null;
  next();
}

// Role gate: requireRole('owner'), requireRole('manager') (= manager or owner), requireRole('staff') (= any signed-in).
const RANK = { staff: 1, manager: 2, owner: 3 };
export const requireRole = (min) => (req, _res, next) => {
  if (!req.role) return next(new HttpError(401, 'Please sign in again'));
  if (RANK[req.role] < RANK[min]) return next(new HttpError(403, 'You do not have access to this action'));
  next();
};

export const intOrNull = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10));
export const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
