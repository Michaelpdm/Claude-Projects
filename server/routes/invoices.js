const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(rows.map(inv => ({ ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    const inv = rows[0];
    res.json({ ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, items, total } = req.body;
    if (!customer_name || !items?.length) return res.status(400).json({ error: 'customer_name and items required' });
    const { rows } = await pool.query(
      `INSERT INTO invoices (customer_name, items, total, status) VALUES ($1,$2,$3,'Draft') RETURNING *`,
      [customer_name, JSON.stringify(items), parseFloat(total)||0]
    );
    const inv = rows[0];
    res.status(201).json({ ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Draft','Sent','Paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await pool.query('UPDATE invoices SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Draft','Sent','Paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await pool.query('UPDATE invoices SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
