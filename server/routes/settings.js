const express = require('express');
const router = express.Router();
const pool = require('../database');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const PIN_KEYS = ['owner_pin', 'manager_pin', 'staff_pin'];

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many PIN attempts. Try again in 15 minutes.' },
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => {
      if (PIN_KEYS.includes(r.key)) {
        result[r.key] = r.value ? 'set' : '';
      } else {
        result[r.key] = r.value;
      }
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PIN verification endpoint — frontend sends role + pin, gets back ok/fail
router.post('/verify-pin', pinLimiter, async (req, res) => {
  try {
    const { role, pin } = req.body;
    if (!role || !pin) return res.status(400).json({ ok: false });
    const pinKey = role === 'owner' ? 'owner_pin' : role === 'manager' ? 'manager_pin' : 'staff_pin';
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [pinKey]);
    if (!rows.length) return res.json({ ok: false });
    const stored = rows[0].value;
    if (!stored) return res.json({ ok: true }); // no PIN set → allow
    const match = await bcrypt.compare(pin, stored);
    res.json({ ok: match });
  } catch (err) { res.status(500).json({ ok: false }); }
});

router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value required' });
    let stored = String(value);
    if (PIN_KEYS.includes(req.params.key) && stored) {
      stored = await bcrypt.hash(stored, 10);
    }
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, stored]
    );
    res.json({ key: req.params.key, value: PIN_KEYS.includes(req.params.key) ? (stored ? 'set' : '') : stored });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      let stored = String(value);
      if (PIN_KEYS.includes(key) && stored) {
        stored = await bcrypt.hash(stored, 10);
      }
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, stored]
      );
    }
    const { rows } = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => {
      result[r.key] = PIN_KEYS.includes(r.key) ? (r.value ? 'set' : '') : r.value;
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
