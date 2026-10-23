import express from 'express';
import { query } from './_lib/db.js';
import { HttpError, authenticate, wrap } from './_lib/http.js';
import settings from './_lib/routes/settings.js';
import products from './_lib/routes/products.js';
import customers from './_lib/routes/customers.js';
import sales from './_lib/routes/sales.js';
import returns from './_lib/routes/returns.js';
import reports from './_lib/routes/reports.js';
import { expenses, debits, invoices } from './_lib/routes/ledger.js';
import { messages, whatsapp } from './_lib/routes/messages.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(authenticate);

app.get('/api/health', wrap(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
}));

app.use('/api/settings', settings);
app.use('/api/products', products);
app.use('/api/customers', customers);
app.use('/api/sales', sales);
app.use('/api/returns', returns);
app.use('/api/reports', reports);
app.use('/api/expenses', expenses);
app.use('/api/debits', debits);
app.use('/api/invoices', invoices);
app.use('/api/messages', messages);
app.use('/api/whatsapp', whatsapp);

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.name === 'MulterError') return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 3 MB)' : err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

export default app;
