// Local API for development: `node --env-file=.env.local dev-api.mjs` (Vite proxies /api to port 5000).
import app from './api/index.js';
const port = process.env.API_PORT || 5000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
