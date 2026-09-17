const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value required' });
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, String(value)]
    );
    res.json({ key: req.params.key, value: String(value) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, String(value)]
      );
    }
    const { rows } = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
