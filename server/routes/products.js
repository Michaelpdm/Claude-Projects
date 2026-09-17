const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../database');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const { search, category, size } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR color ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (size) { params.push(size); query += ` AND size = $${params.length}`; }
    query += ' ORDER BY name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
    res.json(rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sizes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT size FROM products WHERE size IS NOT NULL ORDER BY size');
    res.json(rows.map(r => r.size));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, category, size, color, price, cost, stock_quantity } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const { rows } = await pool.query(
      `INSERT INTO products (name, category, size, color, price, cost, stock_quantity, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, category||null, size||null, color||null, parseFloat(price)||0, parseFloat(cost)||0, parseInt(stock_quantity)||0, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = (await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, category, size, color, price, cost, stock_quantity } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

    const { rows } = await pool.query(
      `UPDATE products SET name=$1, category=$2, size=$3, color=$4, price=$5, cost=$6,
       stock_quantity=$7, image_url=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, category||null, size||null, color||null, parseFloat(price)||0, parseFloat(cost)||0, parseInt(stock_quantity)||0, image_url, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restock', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || isNaN(quantity)) return res.status(400).json({ error: 'Invalid quantity' });
    const { rows } = await pool.query(
      'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [parseInt(quantity), req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
