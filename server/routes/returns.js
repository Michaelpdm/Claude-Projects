const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, p.name as product_name, s.customer_name, s.payment_method
      FROM returns r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN sales s ON r.sale_id = s.id
      ORDER BY r.created_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { sale_id, quantity, reason } = req.body;
    if (!sale_id || !quantity) return res.status(400).json({ error: 'sale_id and quantity required' });

    const sale = (await pool.query('SELECT * FROM sales WHERE id = $1', [sale_id])).rows[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const qty = parseInt(quantity);
    if (qty > sale.quantity) return res.status(400).json({ error: `Cannot return more than sold (${sale.quantity})` });

    const refund_amount = sale.sale_price * qty;

    const { rows } = await pool.query(
      'INSERT INTO returns (sale_id, product_id, quantity, refund_amount, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [sale_id, sale.product_id, qty, refund_amount, reason || null]
    );

    // Restore stock
    if (sale.product_id) {
      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2',
        [qty, sale.product_id]
      );
    }

    res.status(201).json({ ...rows[0], refund_amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
