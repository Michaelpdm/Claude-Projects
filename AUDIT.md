# AUDIT.md — The Fashion Store (baseline, before rebuild)

Audited from source at commit `288f49a`. Status legend: **Dead** = cannot work today, **Broken** = code bug,
**Silent** = works only if backend is up, and fails with no user feedback, **OK\*** = code is correct but depends on the backend being restored.

## 0. Global findings

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| G1 | Backend is gone. `client/vercel.json` and `netlify.toml` proxy `/api/*` to `claude-projects-clothing-store.onrender.com`, which returns `x-render-routing: no-server`. `trinaafashionstore.vercel.app/api/settings` returns 404. | curl, 2026-10-22 | **Dead** — every API-backed control below fails |
| G2 | No response checking. Pages call `apiFetch(...)` and never test `res.ok`; there are no toasts. Failures are invisible. | all pages | **Silent** |
| G3 | Two pages bypass `apiFetch`, so they omit the `x-api-key` header: Customers save (`Customers.jsx:37`) and Inventory save (`Inventory.jsx:69`). Once `API_KEY` is set on the server these always 401. | grep | **Broken** |
| G4 | Auth is client-only. Role lives in `sessionStorage`; the server does not know who is calling. Anyone with the shared `x-api-key` (shipped in the JS bundle as `VITE_API_KEY`) can call every route, including settings and deletes. | `AuthContext.jsx`, `apiKey.js` | **Broken** (security) |
| G5 | `verify-pin` returns `ok:true` when no PIN is set, so a fresh install lets anyone in as Owner. | `settings.js:40` | **Broken** (security) |
| G6 | Image uploads are written to `server/uploads` on local disk; lost on every redeploy. | `products.js` | **Broken** on Vercel/Render |
| G7 | `server/routes/whatsapp.js` is written against a SQLite API (`db.prepare(...).run/get/all`) but `database.js` exports a `pg` Pool, so every incoming-message handler throws. `@whiskeysockets/baileys`, `@hapi/boom` are not in `server/package.json`, so `startWhatsApp()` fails on require and status is stuck at `error`. Session files are saved to disk. | `whatsapp.js`, `package.json` | **Dead** |
| G8 | Money is stored as `REAL` (float). Rounding errors on totals. | `database.js` | **Broken** (minor) |
| G9 | Schema has no product variants; size/colour are single text fields on `products`. Sales rows are one product each, with no order/line-item grouping, so a multi-item checkout is N unrelated rows and the discount is applied to the first row only. | `database.js`, `sales.js /bulk` | Design limit |
| G10 | `.env` and `store.db` are **not** tracked and were never in git history (verified with `git log --all -- server/.env server/store.db`). `.gitignore` already covers them. No history rewrite is needed. | git | OK |
| G11 | Dependencies: `pg` present, `better-sqlite3` absent. The repo is already on Postgres, not SQLite. A SQLite→Postgres import script is not needed; the open question is where the live Postgres (`DATABASE_URL`) is hosted. | `server/package.json` | Info |
| G12 | Colour: ~hundreds of `emerald-*` / `green-*` / `zinc-*` class usages across all pages (e.g. `App.jsx` Access Denied uses `emerald-50` on a dark background). | grep | Redesign |
| G13 | `.claude/launch.json` points at `C:\Users\HP\clothing-store\...`, a folder that no longer matches this checkout. `START.bat` expects client on :3000. | file | **Broken** (dev setup) |

## 1. Login (`PinLogin.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Role cards (Owner / Manager / Staff) | Choose role, show PIN pad | OK (UI-only) |
| Back arrow | Return to role selection | OK |
| PIN pad 0–9, backspace | Enter PIN; auto-submit on 4 digits | OK UI |
| PIN submit → `POST /api/settings/verify-pin` | Verify against bcrypt hash | **Dead** (G1); **insecure** (G4, G5) |
| Wrong-PIN shake, lockout after 5 | Prompt asks for 5-try lockout; current limiter is 10/15min per IP, server-side only | Partial |
| "Start demo" | Does not exist | Missing |

## 2. Layout / navigation (`Sidebar.jsx`, `BottomNav.jsx`, `MobileHeader.jsx`, `Layout.jsx`, `More.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Sidebar nav links | Navigate; role-filtered | OK |
| Sidebar store name / today stats / low-stock count | `GET /api/settings`, `/sales/summary`, `/products` | **Dead** (G1) |
| Sidebar sign-out | Clear role | OK |
| Sidebar close (mobile) | Close drawer | OK |
| BottomNav tabs | Navigate | OK |
| MobileHeader menu / back | Open drawer / `navigate(-1)` | OK |
| Layout overlay click | Close drawer | OK |
| More page tiles + sign-out | Navigate / logout | OK |
| Theme toggle, global search (Ctrl+K), notifications, date range, Demo switch, New-sale button | Do not exist | Missing |

## 3. Home (`Home.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Data: `/sales/summary`, `/sales`, `/products`, `/settings`, `/sales/peak-hours` | Fill KPIs, recent sales, low-stock, peak hours | **Dead** (G1) |
| "New sale" button → `/sales` | Navigate | OK |
| Inventory / Sales tiles → pages | Navigate | OK |
| Low-stock "Restock →" → `/inventory` | Navigate (does not open the restock sheet) | OK, shallow |
| "Record your first sale →" | Navigate | OK |
| Charts (revenue, donuts, rings, heatmap, activity feed, retention, WhatsApp panel) | Per prompt Part 2 | Missing (only a peak-hours strip exists) |

## 4. Sales / POS (`Sales.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Product search + result list → add to cart | Search products, add | Silent (data from `/products`) |
| Cart qty − / + / remove | Edit cart | OK UI |
| Payment method buttons | Pick cash/transfer/pos | OK UI (credit option does not create a debit) |
| Discount input | ₦ discount | OK UI; server applies it to the first line only (G9) |
| Customer search / pick / free text | Link customer | Silent (`/customers`) |
| Complete sale → `POST /api/sales/bulk` | Create sales, reduce stock | **Dead** (G1); not atomic (no DB transaction, so partial failure leaves stock inconsistent) |
| Receipt: "Send WhatsApp" | Opens `wa.me` link | OK |
| Receipt: close | Close | OK |
| Sales history list | `GET /api/sales` (last 100, no filters/pagination) | **Dead** (G1) |
| Return button → modal → `POST /api/returns` | Create return + restock | **Dead** (G1); refund ignores discount |
| Sell on credit → debit | Does not exist | Missing |
| Void sale (`DELETE /api/sales/:id`) | Exists on server, no UI; does not restock | Broken/unused |
| Filters, date range, CSV export of history, size/colour pick | Do not exist | Missing |

## 5. Inventory (`Inventory.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Search, category filter, size filter, Clear | Filter products | Silent |
| Add Product → form → `POST /products` (multipart) | Create product | **Dead** (G1); bypasses `apiFetch` (G3) |
| Image picker | Upload image | **Broken** (G6) |
| Edit → `PUT /products/:id` | Update | **Dead** (G1, G3) |
| Delete → `DELETE /products/:id` | Delete (no confirm check, no sales guard) | **Dead** (G1) |
| Restock → `POST /products/:id/restock` | Add qty | **Dead** (G1); no reason logged |
| Variants matrix, categories mgmt, low-stock threshold per product, dead-stock filter, grid/table toggle, CSV import | Do not exist | Missing |

## 6. Customers (`Customers.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| List, open detail | `GET /customers`, `/customers/:id` | **Dead** (G1) |
| Add / Edit form → POST/PUT | Save customer | **Dead** (G1); bypasses `apiFetch` (G3) |
| Delete | `DELETE /customers/:id` | **Dead** (G1) |
| Tags, lifetime value, debt balance, WhatsApp thread, Message button | Do not exist | Missing |

## 7. Debits (`Debits.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| List + summary | `GET /debits`, `/debits/summary` | **Dead** (G1) |
| Add Debit form → POST | Create | **Dead** (G1) |
| Mark Cleared → `POST /debits/:id/clear` | Whole-debit clear only | **Dead** (G1) |
| Delete | `DELETE` | **Dead** (G1) |
| Part payments, ageing buckets, Send reminder | Do not exist | Missing |

## 8. Invoices (`Invoices.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| List, open invoice view | `GET /invoices` | **Dead** (G1) |
| New invoice form (add/remove lines, product autofill) → POST | Create (always starts as Draft; total is trusted from the client) | **Dead** (G1) |
| Status select → `PATCH /invoices/:id/status` | Draft / Sent / Paid only (no Part-paid / Overdue) | **Dead** (G1) |
| Print (`window.print`) | Print view | OK |
| Delete | `DELETE` | **Dead** (G1) |
| Edit, PDF download, share link, Send on WhatsApp, record payment | Do not exist | Missing |

## 9. Expenses (`Expenses.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| List + summary | `GET /expenses`, `/expenses/summary` | **Dead** (G1) |
| Add form → POST | Create | **Dead** (G1) |
| Delete | `DELETE` | **Dead** (G1) |
| Edit (server `PUT` exists, no UI), receipt upload, monthly chart | Missing |

## 10. Reports (`Reports.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Period tabs → `GET /reports/pl?period=` | Today / week / month / year P&L | **Dead** (G1) |
| Best sellers table | `GET /reports/bestsellers` | **Dead** (G1) |
| Export buttons → `/reports/export/{sales,products,customers}` | CSV download | **Dead** (G1) |
| Custom date range, by category/staff/payment, stock valuation, debt ageing, PDF | Do not exist | Missing |

## 11. Inbox (`Messages.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Conversation list, open thread, refresh | `GET /messages`, `/messages/:phone` | **Dead** (G1) |
| Back (mobile) | OK |
| Reply box, Take over, Send stock list, unread counts | Do not exist | Missing |

## 12. Settings (`Settings.jsx`)

| Control | Intended behaviour | Status |
|---------|--------------------|--------|
| Store name / phone / away message inputs + Save | `PUT /settings/:key` | **Dead** (G1) |
| Currency select + Save | `PUT /settings/currency` | **Dead** (G1) |
| Owner-available toggle (away mode) | `PUT /settings/owner_available` | **Dead** (G1) |
| Change PIN modal (3 roles) | `PUT /settings/<role>_pin` (bcrypt) | **Dead** (G1); any caller can change the owner PIN (G4) |
| WhatsApp: status poll, Load QR, Connect, Disconnect | `/whatsapp/*` | **Dead** (G1, G7) |
| Targets, theme, staff mgmt, demo options, data export, provider choice, rules | Do not exist | Missing |

## 13. Server routes with no UI

`DELETE /sales/:id`, `PUT /expenses/:id`, `GET /invoices/:id`, `GET /returns`, `GET /products/:id` — present, unused.
Duplicate routes: `POST|PUT /debits/:id/clear`, `PATCH|PUT /invoices/:id/status`.

## Summary

- Controls with working code that only fail because the backend is down: the majority of the app (G1).
- Real code defects: G3, G4, G5, G6, G7, G9, plus no transactional safety on sales/returns.
- Features the rebuild prompt asks for that do not exist yet: dashboard widgets, Demo Mode, theme toggle, command palette, variants, part payments, returns UI list, staff table, WhatsApp rules engine, Cloud API adapter, PDF export, Playwright tests.
