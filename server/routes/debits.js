const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM debits ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as "totalOutstanding", COUNT(*) as count
      FROM debits WHERE status = 'Pending'
    `);
    res.json({ totalOutstanding: rows[0].totalOutstanding, count: parseInt(rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, amount, description, date_due, notes } = req.body;
    if (!customer_name || !amount) return res.status(400).json({ error: 'customer_name and amount required' });
    const { rows } = await pool.query(
      `INSERT INTO debits (customer_name, amount, description, date_due, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [customer_name, parseFloat(amount), description||null, date_due||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/clear', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE debits SET status = 'Cleared' WHERE id = $1 RETURNING *`, [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/clear', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE debits SET status = 'Cleared' WHERE id = $1 RETURNING *`, [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM debits WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
