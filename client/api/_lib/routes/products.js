import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { HttpError, num, requireRole, wrap } from '../http.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

// Images are stored inline (data URI) for now; list queries swap them for a small URL so lists stay light.
const COLS = `id, name, category, size, color, price, cost, stock_quantity, low_stock_threshold, created_at, updated_at,
  CASE WHEN image_url LIKE 'data:%'
       THEN '/api/products/' || id || '/image?v=' || extract(epoch from updated_at)::bigint
       ELSE image_url END AS image_url`;

function parseBody(b) {
  const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Product name is required');
  const price = num(b.price);
  const cost = num(b.cost);
  const stock = parseInt(b.stock_quantity, 10) || 0;
  if (price < 0 || cost < 0) throw new HttpError(400, 'Price and cost cannot be negative');
  if (stock < 0) throw new HttpError(400, 'Stock cannot be negative');
  return {
    name, price, cost, stock,
    category: b.category || null, size: b.size || null, color: b.color || null,
    threshold: b.low_stock_threshold === undefined || b.low_stock_threshold === '' ? 3 : parseInt(b.low_stock_threshold, 10) || 0,
  };
}

const toDataUri = (f) => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
const checkImage = (f) => {
  if (f && !/^image\/(png|jpe?g|webp|gif)$/.test(f.mimetype)) throw new HttpError(400, 'Image must be PNG, JPG, WebP or GIF');
};

// Public so <img> tags can load it (they cannot send auth headers). Product photos are not sensitive.
router.get('/:id/image', wrap(async (req, res) => {
  const { rows } = await query('SELECT image_url FROM products WHERE id = $1', [req.params.id]);
  const m = /^data:([^;]+);base64,(.*)$/s.exec(rows[0]?.image_url || '');
  if (!m) throw new HttpError(404, 'No image');
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(m[2], 'base64'));
}));

router.use(requireRole('staff'));

router.get('/', wrap(async (req, res) => {
  const { search, category, size } = req.query;
  const params = [];
  let sql = `SELECT ${COLS} FROM products WHERE 1=1`;
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (name ILIKE $${params.length} OR color ILIKE $${params.length} OR category ILIKE $${params.length})`;
  }
  if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
  if (size) { params.push(size); sql += ` AND size = $${params.length}`; }
  sql += ' ORDER BY name ASC';
  res.json((await query(sql, params)).rows);
}));

router.get('/categories', wrap(async (_req, res) => {
  const { rows } = await query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
  res.json(rows.map((r) => r.category));
}));

router.get('/sizes', wrap(async (_req, res) => {
  const { rows } = await query('SELECT DISTINCT size FROM products WHERE size IS NOT NULL ORDER BY size');
  res.json(rows.map((r) => r.size));
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows } = await query(`SELECT ${COLS} FROM products WHERE id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Product not found');
  res.json(rows[0]);
}));

router.post('/', requireRole('manager'), upload.single('image'), wrap(async (req, res) => {
  const p = parseBody(req.body);
  checkImage(req.file);
  const { rows } = await query(
    `INSERT INTO products (name, category, size, color, price, cost, stock_quantity, low_stock_threshold, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [p.name, p.category, p.size, p.color, p.price, p.cost, p.stock, p.threshold, req.file ? toDataUri(req.file) : null]
  );
  res.status(201).json((await query(`SELECT ${COLS} FROM products WHERE id = $1`, [rows[0].id])).rows[0]);
}));

router.put('/:id', requireRole('manager'), upload.single('image'), wrap(async (req, res) => {
  const p = parseBody(req.body);
  checkImage(req.file);
  const { rowCount } = await query(
    `UPDATE products SET name=$1, category=$2, size=$3, color=$4, price=$5, cost=$6, stock_quantity=$7,
       low_stock_threshold=$8, image_url=COALESCE($9, image_url), updated_at=now() WHERE id=$10`,
    [p.name, p.category, p.size, p.color, p.price, p.cost, p.stock, p.threshold, req.file ? toDataUri(req.file) : null, req.params.id]
  );
  if (!rowCount) throw new HttpError(404, 'Product not found');
  res.json((await query(`SELECT ${COLS} FROM products WHERE id = $1`, [req.params.id])).rows[0]);
}));

router.delete('/:id', requireRole('manager'), wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Product not found');
  res.json({ ok: true });
}));

router.post('/:id/restock', requireRole('manager'), wrap(async (req, res) => {
  const qty = parseInt(req.body?.quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'Enter a quantity of 1 or more');
  const { rows } = await query(
    'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now() WHERE id = $2 RETURNING id',
    [qty, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Product not found');
  res.json((await query(`SELECT ${COLS} FROM products WHERE id = $1`, [req.params.id])).rows[0]);
}));

export default router;
