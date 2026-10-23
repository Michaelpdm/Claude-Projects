import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { HttpError, requireRole, signToken, wrap } from '../http.js';

const router = Router();
const PIN_KEYS = ['owner_pin', 'manager_pin', 'staff_pin'];
const PUBLIC_KEYS = ['store_name', 'currency'];
const EDITABLE = ['store_name', 'store_phone', 'currency', 'owner_available', 'away_message', 'daily_target', 'bank_name', 'account_number', 'account_name', 'delivery_info', 'opening_hours', ...PIN_KEYS];
const ROLES = ['owner', 'manager', 'staff'];
const MAX_ATTEMPTS = 10;

async function readSettings(role) {
  const { rows } = await query('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) {
    if (PIN_KEYS.includes(r.key)) out[r.key] = r.value ? 'set' : '';
    else if (role || PUBLIC_KEYS.includes(r.key)) out[r.key] = r.value;
  }
  return out;
}

async function saveSetting(key, value) {
  if (!EDITABLE.includes(key)) throw new HttpError(400, `Unknown setting "${key}"`);
  let stored = String(value ?? '');
  if (PIN_KEYS.includes(key) && stored) {
    if (!/^\d{4}$/.test(stored)) throw new HttpError(400, 'PIN must be exactly 4 digits');
    stored = await bcrypt.hash(stored, 10);
  }
  if (key === 'account_number' && stored && !/^\d{10}$/.test(stored)) throw new HttpError(400, 'Account number must be 10 digits');
  if (key === 'daily_target' && !(parseFloat(stored) >= 0)) throw new HttpError(400, 'Target must be a number');
  await query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, stored]
  );
}

// Public: store name, currency and which PINs exist (needed by the login screen).
// Signed in: every non-secret setting.
router.get('/', wrap(async (req, res) => res.json(await readSettings(req.role))));

router.post('/verify-pin', wrap(async (req, res) => {
  const { role, pin } = req.body || {};
  if (!ROLES.includes(role) || !/^\d{4}$/.test(String(pin || ''))) {
    throw new HttpError(400, 'Choose a role and enter a 4-digit PIN');
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  const recent = await query(
    `SELECT COUNT(*)::int AS n FROM login_attempts WHERE ip = $1 AND created_at > now() - interval '15 minutes'`,
    [ip]
  );
  if (recent.rows[0].n >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong PINs. Try again in 15 minutes.');

  const { rows } = await query('SELECT value FROM settings WHERE key = $1', [`${role}_pin`]);
  const stored = rows[0]?.value || '';

  let ok = false;
  let setup = false;
  if (!stored) {
    // Fresh install: only the owner may enter, then must set PINs in Settings.
    if (role !== 'owner') throw new HttpError(403, 'No PIN has been set for this role yet. Ask the owner.');
    ok = true;
    setup = true;
  } else {
    ok = await bcrypt.compare(String(pin), stored);
  }

  if (!ok) {
    await query('INSERT INTO login_attempts (ip, role) VALUES ($1, $2)', [ip, role]);
    return res.status(401).json({ ok: false, error: 'Wrong PIN' });
  }
  await query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
  res.json({ ok: true, role, setup, token: signToken(role) });
}));

router.put('/:key', requireRole('owner'), wrap(async (req, res) => {
  if (req.body?.value === undefined) throw new HttpError(400, 'value required');
  await saveSetting(req.params.key, req.body.value);
  res.json(await readSettings(req.role));
}));

router.put('/', requireRole('owner'), wrap(async (req, res) => {
  for (const [key, value] of Object.entries(req.body || {})) await saveSetting(key, value);
  res.json(await readSettings(req.role));
}));

export default router;
