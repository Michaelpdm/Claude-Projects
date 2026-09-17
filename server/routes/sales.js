const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, p.name as product_name, p.category, p.size, p.color
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.created_at DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const [today, week, month] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(sale_price * quantity), 0) as total, COUNT(*) as count
                  FROM sales WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE`),
      pool.query(`SELECT COALESCE(SUM(sale_price * quantity), 0) as total, COUNT(*) as count
                  FROM sales WHERE created_at >= DATE_TRUNC('week', NOW())`),
      pool.query(`SELECT COALESCE(SUM(sale_price * quantity), 0) as total
                  FROM sales WHERE created_at >= DATE_TRUNC('month', NOW())`),
    ]);
    res.json({
      today: { total: today.rows[0].total, count: parseInt(today.rows[0].count) },
      thisWeek: { total: week.rows[0].total, count: parseInt(week.rows[0].count) },
      thisMonth: { total: month.rows[0].total },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { product_id, quantity, sale_price, customer_name, payment_method } = req.body;
    const product = (await pool.query('SELECT * FROM products WHERE id = $1', [product_id])).rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const qty = parseInt(quantity);
    if (product.stock_quantity < qty) {
      return res.status(400).json({ error: `Insufficient stock. Only ${product.stock_quantity} available.` });
    }

    const { rows } = await pool.query(
      `INSERT INTO sales (product_id, quantity, sale_price, customer_name, payment_method)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [product_id, qty, parseFloat(sale_price), customer_name||null, payment_method||'cash']
    );

    await pool.query(
      'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
      [qty, product_id]
    );

    res.status(201).json({ ...rows[0], product_name: product.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bulk sale — multiple items in one checkout, price taken from product record
router.post('/bulk', async (req, res) => {
  try {
    const { items, customer_name, payment_method } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });

    // Validate stock for all items first
    for (const item of items) {
      const product = (await pool.query('SELECT * FROM products WHERE id = $1', [item.product_id])).rows[0];
      if (!product) return res.status(404).json({ error: `Product not found` });
      if (product.stock_quantity < parseInt(item.quantity)) {
        return res.status(400).json({ error: `Only ${product.stock_quantity} of "${product.name}" in stock` });
      }
    }

    const results = [];
    for (const item of items) {
      const product = (await pool.query('SELECT * FROM products WHERE id = $1', [item.product_id])).rows[0];
      const qty = parseInt(item.quantity);
      const { rows } = await pool.query(
        `INSERT INTO sales (product_id, quantity, sale_price, customer_name, payment_method)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [item.product_id, qty, product.price, customer_name||null, payment_method||'cash']
      );
      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
        [qty, item.product_id]
      );
      results.push({ ...rows[0], product_name: product.name, unit_price: product.price });
    }

    res.status(201).json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
