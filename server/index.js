const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/debits', require('./routes/debits'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Clothing Store API running on port ${PORT}`);
});
