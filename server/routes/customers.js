const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(s.id) as total_purchases,
             COALESCE(SUM(s.sale_price * s.quantity), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
      GROUP BY c.id ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO customers (name, phone, notes) VALUES ($1,$2,$3) RETURNING *',
      [name, phone || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = (await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id])).rows[0];
    if (!customer) return res.status(404).json({ error: 'Not found' });
    const { rows: purchases } = await pool.query(`
      SELECT s.*, p.name as product_name, p.category, p.size, p.color
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      WHERE s.customer_id = $1 ORDER BY s.created_at DESC
    `, [req.params.id]);
    res.json({ ...customer, purchases });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    const { rows } = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, notes=$3 WHERE id=$4 RETURNING *',
      [name, phone || null, notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
