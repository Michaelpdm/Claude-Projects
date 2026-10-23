// Demo Mode backend: answers the same /api requests as the real server from an in-memory,
// deterministic dataset ("Atelier Lagos"). Nothing here is sent anywhere or saved.
import { buildDashboard } from '../../shared/dashboard.js';
import { rng } from './demoData.js';

const FLAG = 'fs_demo';
const LAGOS = 3600000;
const DAY = 86400000;

export const isDemo = () => { try { return sessionStorage.getItem(FLAG) === '1'; } catch { return false; } };
export const enterDemo = () => { try { sessionStorage.setItem(FLAG, '1'); } catch { /* storage unavailable */ } state = null; };
export const exitDemo = () => {
  try { sessionStorage.removeItem(FLAG); } catch { /* storage unavailable */ }
  clearTimeout(simTimer);
  state = null;
};

let state = null;
let simTimer = null;
let startedAt = 0;
let baseNow = 0;

// The demo clock sits at 5:10pm Lagos time today and keeps ticking, so "today so far" always looks like a busy afternoon.
const simNow = () => baseNow + (Date.now() - startedAt);
const lagosDate = (ts) => new Date(ts + LAGOS);
const ymd = (ts) => lagosDate(ts).toISOString().slice(0, 10);
const atLagos = (dayTs, hour, minute) => {
  const d = lagosDate(dayTs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 1, minute);
};

const CATALOG = [
  ['Ankara Maxi Dress', 'Ankara', 38500, 0.5, 'dress'], ['Ankara Peplum Top', 'Ankara', 19500, 0.45, 'top'],
  ['Silk Wrap Dress', 'Dresses', 54000, 0.5, 'dress'], ['Asoebi Gown', 'Dresses', 92000, 0.55, 'dress'],
  ['Lace Two-Piece Set', 'Two-piece sets', 67500, 0.5, 'set'], ['Satin Camisole Set', 'Two-piece sets', 34500, 0.48, 'set'],
  ['Embroidered Agbada', 'Agbada & Kaftans', 185000, 0.55, 'men'], ['Linen Kaftan', 'Agbada & Kaftans', 42000, 0.5, 'men'],
  ['Senator Native Set', 'Agbada & Kaftans', 78000, 0.52, 'men'], ['Pleated Trousers', 'Trousers', 24000, 0.5, 'men'],
  ['Pencil Skirt', 'Trousers', 18500, 0.45, 'top'], ['Leather Slide Sandals', 'Shoes', 28500, 0.55, 'shoe'],
  ['Block Heel Mules', 'Shoes', 36000, 0.55, 'shoe'], ['Structured Tote Bag', 'Bags', 46000, 0.5, 'bag'],
  ['Beaded Clutch', 'Bags', 22000, 0.45, 'bag'], ['Denim Jacket', 'Dresses', 31000, 0.5, 'top'],
];
const SIZES = { dress: ['10', '12', '14'], top: ['S', 'M', 'L'], set: ['S', 'M', 'L'], men: ['M', 'L', 'XL'], shoe: ['39', '40', '41'], bag: ['One size'] };
const COLORS = ['Champagne', 'Midnight', 'Blue', 'Rose', 'Ivory', 'Tan', 'Wine', 'Black'];
const FIRST = ['Chioma', 'Tolu', 'Ngozi', 'Femi', 'Amaka', 'Ibrahim', 'Kemi', 'Sade', 'Uche', 'Bisi', 'Yemi', 'Halima', 'Dayo', 'Efe', 'Tola', 'Nneka', 'Seun', 'Zainab', 'Ife', 'Obinna'];
const LAST = ['Adeyemi', 'Okafor', 'Balogun', 'Eze', 'Bello', 'Adebayo', 'Nwosu', 'Okonkwo', 'Lawal', 'Ogunleye', 'Musa', 'Ibrahim'];
const PAY = ['cash', 'cash', 'transfer', 'transfer', 'transfer', 'pos', 'pos', 'credit'];
const HOUR_W = [0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 7, 8, 8, 7, 8, 9, 9, 10, 8, 5]; // index = Lagos hour

function build() {
  const r = rng(2024);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const now = simNow();

  const products = [];
  CATALOG.forEach(([name, category, price, costRatio, kind], ci) => {
    SIZES[kind].forEach((size, vi) => {
      products.push({
        id: products.length + 1, name, category, size, color: COLORS[(ci + vi * 3) % COLORS.length],
        price, cost: Math.round((price * costRatio) / 500) * 500,
        stock_quantity: Math.floor(r() * 13) + 2, low_stock_threshold: 3, image_url: null,
        created_at: new Date(now - 60 * DAY).toISOString(), updated_at: new Date(now - DAY).toISOString(),
      });
    });
  });
  // a few items running low, for the "low stock" panel
  [[0, 3], [5, 2], [22, 1], [30, 2], [41, 1]].forEach(([i, q]) => { if (products[i]) products[i].stock_quantity = q; });

  const customers = Array.from({ length: 64 }, (_, i) => ({
    id: i + 1, name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: `+234 ${pick(['803', '806', '810', '703', '813', '907'])} ${String(Math.floor(r() * 900) + 100)} ${String(Math.floor(r() * 9000) + 1000)}`,
    notes: i % 9 === 0 ? 'VIP, prefers WhatsApp' : null, tags: [], created_at: new Date(now - (60 - i) * DAY).toISOString(),
  }));

  // weight popular items
  const weights = products.map((p) => (p.price > 90000 ? 1 : p.price > 60000 ? 2 : p.price > 40000 ? 4 : 7));
  const bag = products.flatMap((p, i) => Array(weights[i]).fill(p.id));
  let saleId = 0;
  const sales = [];
  const addOrder = (ts) => {
    const ref = Math.floor(r() * 0xfffff).toString(16).toUpperCase().padStart(5, '0');
    const cust = r() < 0.55 ? pick(customers) : null;
    const method = pick(PAY);
    const lines = r() < 0.28 ? 2 : 1;
    for (let l = 0; l < lines; l++) {
      const p = products[pick(bag) - 1];
      const qty = r() < 0.12 ? 2 : 1;
      const disc = r() < 0.1 ? Math.round((p.price * qty * 0.05) / 100) * 100 : 0;
      sales.push({
        id: ++saleId, order_ref: ref, product_id: p.id, customer_id: cust?.id || null, quantity: qty, sale_price: p.price,
        discount: disc, customer_name: cust?.name || null, payment_method: method, created_at: new Date(ts).toISOString(),
      });
    }
  };
  const hourPick = (maxHour) => {
    const ws = HOUR_W.map((w, h) => (h <= maxHour ? w : 0));
    let x = r() * ws.reduce((a, b) => a + b, 0);
    for (let h = 0; h < ws.length; h++) { x -= ws[h]; if (x <= 0) return h; }
    return 12;
  };
  for (let off = 29; off >= 0; off--) {
    const day = now - off * DAY;
    const weekend = [0, 6].includes(lagosDate(day).getUTCDay());
    const n = off === 0 ? 47 : Math.round(24 + (29 - off) * 0.35 + (weekend ? 8 : 0) + r() * 9);
    for (let i = 0; i < n; i++) {
      const h = off === 0 ? Math.min(hourPick(17), 17) : hourPick(20);
      const m = off === 0 && h === 17 ? Math.floor(r() * 8) : Math.floor(r() * 60);
      addOrder(atLagos(day, off === 0 ? Math.min(Math.max(h, 8), 17) : Math.max(h, 9), m));
    }
  }
  sales.sort((a, b) => a.created_at.localeCompare(b.created_at));
  sales.forEach((s, i) => { s.id = i + 1; });

  const expCats = [['Stock Purchase', 350000], ['Rent', 280000], ['Transport', 18000], ['Salary', 160000], ['Utilities', 42000], ['Marketing', 55000], ['General', 12000]];
  const expenses = Array.from({ length: 24 }, (_, i) => {
    const [category, base] = pick(expCats);
    return {
      id: i + 1, description: `${category} ${i % 2 ? 'payment' : 'bill'}`, amount: Math.round((base * (0.5 + r() * 0.8)) / 500) * 500,
      category, expense_date: ymd(now - Math.floor(r() * 29) * DAY), notes: null, created_at: new Date(now - i * DAY).toISOString(),
    };
  });

  const pending = [95000, 120000, 45000, 80000, 150000, 60000, 75000, 30000, 30000];
  const debits = pending.map((amount, i) => ({
    id: i + 1, customer_name: `${pick(FIRST)} ${pick(LAST)}`, amount, description: 'Credit sale', notes: null,
    date_due: ymd(now + (i - 3) * 4 * DAY), status: 'Pending', created_at: new Date(now - (i + 2) * 3 * DAY).toISOString(),
  })).concat([40000, 65000, 55000, 90000, 35000].map((amount, i) => ({
    id: 10 + i, customer_name: `${pick(FIRST)} ${pick(LAST)}`, amount, description: 'Credit sale', notes: null,
    date_due: ymd(now - (i + 8) * DAY), status: 'Cleared', created_at: new Date(now - (i + 10) * 4 * DAY).toISOString(),
  })));

  const invoices = ['Funke Williams', 'Atelier Weddings Ltd', 'Hauwa Sani', 'Oluchi Okeke', 'Bridal Lounge Lekki', 'Dami Fashola'].map((name, i) => {
    const items = [{ description: pick(CATALOG)[0], quantity: 2 + (i % 3), unit_price: 38500 + i * 4000 }, { description: 'Alteration', quantity: 1, unit_price: 8000 }];
    return { id: i + 1, customer_name: name, items, total: items.reduce((t, x) => t + x.quantity * x.unit_price, 0), status: ['Paid', 'Sent', 'Draft', 'Paid', 'Sent', 'Paid'][i], created_at: new Date(now - i * 2 * DAY).toISOString() };
  });

  const msgPhones = ['2348035550142', '2347065550187', '2348105550109', '2349075550133', '2348135550168', '2347035550121'];
  const lines = [
    ['Good evening, is the Ankara maxi dress available in size 12?', 'Good evening 👋 Yes, size 12 is available (3 left) at ₦38,500.', "I'll take it"],
    ['Do you deliver to Ikeja?', 'Yes! Mainland delivery is ₦3,500 and takes 1 to 2 days.'],
    ['Hello', 'Welcome back! New arrivals: Asoebi Gown ₦92,000 and Linen Kaftan ₦42,000.', 'Linen kaftan please'],
    ['What time do you open tomorrow?', 'We open 10am to 7pm, Monday to Saturday 😊'],
    ['Do you have the senator set in XL?', 'Yes, Senator Native Set in XL is in stock at ₦78,000.'],
    ['Please how much is the beaded clutch', 'The Beaded Clutch is ₦22,000.'],
  ];
  let mid = 0;
  const messages = [];
  msgPhones.forEach((phone, pi) => {
    lines[pi].forEach((text, li) => {
      messages.push({ id: ++mid, phone_number: phone, direction: li % 2 === 0 ? 'incoming' : 'outgoing', message_text: text, sender: li % 2 ? 'assistant' : null, created_at: new Date(now - (pi * 40 + (lines[pi].length - li) * 2) * 60000).toISOString() });
    });
  });

  // daily target is set so today's sales so far sit at about 68% of it
  const todayKey = ymd(now);
  const todayRevenue = sales.filter((x) => ymd(new Date(x.created_at).getTime()) === todayKey)
    .reduce((t, x) => t + x.sale_price * x.quantity - x.discount, 0);
  const dailyTarget = Math.max(500000, Math.ceil(todayRevenue / 0.68 / 50000) * 50000);

  return {
    products, customers, sales, expenses, debits, invoices, messages, extraActivity: [],
    returns: [
      { id: 1, sale_id: 5, product_id: 3, quantity: 1, refund_amount: 54000, reason: 'Wrong size', created_at: new Date(now - 4 * DAY).toISOString() },
      { id: 2, sale_id: 9, product_id: 12, quantity: 1, refund_amount: 28500, reason: 'Defective strap', created_at: new Date(now - 9 * DAY).toISOString() },
    ],
    settings: {
      store_name: 'Atelier Lagos', store_phone: '+234 803 555 0100', currency: 'NGN', owner_available: 'true',
      away_message: 'Hello! The team is away right now. Here is what we have in stock:', daily_target: String(dailyTarget),
      owner_pin: 'set', manager_pin: 'set', staff_pin: 'set',
    },
    seq: { sale: sales.length, product: products.length, customer: customers.length, expense: expenses.length, debit: 20, invoice: invoices.length, ret: 2 },
  };
}

function ensure() {
  if (state) return state;
  const real = Date.now();
  const d = lagosDate(real);
  baseNow = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 16, 10); // 17:10 Lagos
  startedAt = real;
  state = build();
  scheduleSim();
  return state;
}

function scheduleSim() {
  clearTimeout(simTimer);
  simTimer = setTimeout(() => {
    if (!state || !isDemo()) return;
    const p = state.products.filter((x) => x.stock_quantity > 1);
    const prod = p[Math.floor(Math.random() * p.length)];
    if (prod) pushSale(prod, 1, null, ['cash', 'transfer', 'pos'][Math.floor(Math.random() * 3)]);
    scheduleSim();
  }, 6000 + Math.random() * 6000);
}

function pushSale(prod, qty, customerName, method, ref) {
  const s = state;
  prod.stock_quantity = Math.max(0, prod.stock_quantity - qty);
  s.sales.push({
    id: ++s.seq.sale, order_ref: ref || Math.floor(Math.random() * 0xfffff).toString(16).toUpperCase().padStart(5, '0'),
    product_id: prod.id, customer_id: null, quantity: qty, sale_price: prod.price, discount: 0,
    customer_name: customerName, payment_method: method, created_at: new Date(simNow()).toISOString(),
  });
}

// Used by the scripted WhatsApp conversations so the dashboard numbers move when a chat ends in a sale.
export function demoRecordChatSale({ product, buyer }) {
  const s = ensure();
  const prod = s.products.find((p) => p.name === product && p.stock_quantity > 0) || s.products.find((p) => p.stock_quantity > 0);
  if (prod) pushSale(prod, 1, buyer, 'transfer');
}
export function demoAddActivity(item) {
  ensure().extraActivity.unshift({ id: `x${Date.now()}`, at: simNow(), ...item });
}

// ── helpers ──
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const err = (status, error) => json({ error }, status);
const net = (s) => s.sale_price * s.quantity - s.discount;
const csv = (name, header, rows) => new Response(
  [header.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'),
  { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=${name}.csv` } });

const withProduct = (s, st) => {
  const p = st.products.find((x) => x.id === s.product_id);
  return { ...s, product_name: p?.name || null, category: p?.category || null, size: p?.size || null, color: p?.color || null, cost: p?.cost || 0 };
};
const body = (b) => (b instanceof FormData ? Object.fromEntries([...b.entries()].filter(([, v]) => typeof v === 'string')) : b ? JSON.parse(b) : {});
const startOf = (period, now) => {
  const d = lagosDate(now);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (period === 'today') return Date.UTC(y, m, day) - LAGOS;
  if (period === 'week') return Date.UTC(y, m, day - ((d.getUTCDay() + 6) % 7)) - LAGOS;
  if (period === 'year') return Date.UTC(y, 0, 1) - LAGOS;
  return Date.UTC(y, m, 1) - LAGOS;
};

export function demoRequest(method, rawUrl, rawBody) {
  const st = ensure();
  const now = simNow();
  const url = new URL(rawUrl, 'http://demo');
  const seg = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  const [area, a, b] = seg;
  const q = url.searchParams;
  const data = () => body(rawBody);
  const id = parseInt(a, 10);
  const find = (list) => list.find((x) => x.id === id);
  const remove = (list) => { const i = list.findIndex((x) => x.id === id); if (i < 0) return false; list.splice(i, 1); return true; };

  switch (area) {
    case 'settings': {
      if (a === 'verify-pin') return json({ ok: true, role: data().role, token: 'demo-token', setup: false });
      if (method === 'PUT') {
        const upd = a ? { [a]: data().value } : data();
        for (const [k, v] of Object.entries(upd)) st.settings[k] = k.endsWith('_pin') ? (v ? 'set' : '') : String(v);
      }
      return json({ ...st.settings });
    }

    case 'products': {
      if (a === 'categories') return json([...new Set(st.products.map((p) => p.category))].sort());
      if (a === 'sizes') return json([...new Set(st.products.map((p) => p.size))].sort());
      if (b === 'restock') {
        const p = find(st.products); const n = parseInt(data().quantity, 10);
        if (!p) return err(404, 'Product not found');
        if (!(n >= 1)) return err(400, 'Enter a quantity of 1 or more');
        p.stock_quantity += n; return json(p);
      }
      if (method === 'GET' && !a) {
        const search = (q.get('search') || '').toLowerCase();
        return json(st.products.filter((p) => (!search || `${p.name} ${p.color} ${p.category}`.toLowerCase().includes(search)) && (!q.get('category') || p.category === q.get('category')) && (!q.get('size') || p.size === q.get('size'))).sort((x, y) => x.name.localeCompare(y.name)));
      }
      if (method === 'GET') { const p = find(st.products); return p ? json(p) : err(404, 'Product not found'); }
      if (method === 'DELETE') return remove(st.products) ? json({ ok: true }) : err(404, 'Product not found');
      const d = data();
      if (!String(d.name || '').trim()) return err(400, 'Product name is required');
      const fields = { name: d.name.trim(), category: d.category || null, size: d.size || null, color: d.color || null, price: parseFloat(d.price) || 0, cost: parseFloat(d.cost) || 0, stock_quantity: parseInt(d.stock_quantity, 10) || 0 };
      if (method === 'POST') { const p = { id: ++st.seq.product, low_stock_threshold: 3, image_url: null, created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(), ...fields }; st.products.push(p); return json(p, 201); }
      const p = find(st.products); if (!p) return err(404, 'Product not found');
      Object.assign(p, fields); return json(p);
    }

    case 'customers': {
      const stats = (c) => { const ss = st.sales.filter((s) => s.customer_id === c.id); return { total_purchases: ss.length, total_spent: ss.reduce((t, s) => t + net(s), 0) }; };
      if (method === 'GET' && !a) return json(st.customers.map((c) => ({ ...c, ...stats(c) })).sort((x, y) => x.name.localeCompare(y.name)));
      if (method === 'GET') { const c = find(st.customers); return c ? json({ ...c, purchases: st.sales.filter((s) => s.customer_id === c.id).map((s) => withProduct(s, st)).reverse() }) : err(404, 'Customer not found'); }
      if (method === 'DELETE') return remove(st.customers) ? json({ ok: true }) : err(404, 'Customer not found');
      const d = data(); if (!String(d.name || '').trim()) return err(400, 'Name required');
      if (method === 'POST') { const c = { id: ++st.seq.customer, name: d.name.trim(), phone: d.phone || null, notes: d.notes || null, tags: [], created_at: new Date(now).toISOString() }; st.customers.push(c); return json(c, 201); }
      const c = find(st.customers); if (!c) return err(404, 'Customer not found');
      Object.assign(c, { name: d.name.trim(), phone: d.phone || null, notes: d.notes || null }); return json(c);
    }

    case 'sales': {
      const inRange = (from) => st.sales.filter((s) => new Date(s.created_at).getTime() >= from);
      if (a === 'summary') {
        const agg = (from) => { const l = inRange(from); return { total: l.reduce((t, s) => t + net(s), 0), count: new Set(l.map((s) => s.order_ref || s.id)).size }; };
        return json({ today: agg(startOf('today', now)), thisWeek: agg(startOf('week', now)), thisMonth: agg(startOf('month', now)) });
      }
      if (a === 'peak-hours') {
        const counts = Array(24).fill(0);
        inRange(now - 7 * DAY).forEach((s) => { counts[lagosDate(new Date(s.created_at).getTime()).getUTCHours()]++; });
        return json(counts.map((count, hour) => ({ hour, count })));
      }
      if (method === 'GET') return json([...st.sales].reverse().slice(0, Math.min(parseInt(q.get('limit'), 10) || 100, 500)).map((s) => withProduct(s, st)));
      if (method === 'DELETE') {
        const s = find(st.sales); if (!s) return err(404, 'Sale not found');
        const p = st.products.find((x) => x.id === s.product_id); if (p) p.stock_quantity += s.quantity;
        remove(st.sales); return json({ ok: true });
      }
      // POST /bulk or POST /
      const d = data();
      const items = a === 'bulk' ? d.items : [{ product_id: d.product_id, quantity: d.quantity }];
      if (!Array.isArray(items) || !items.length) return err(400, 'Add at least one item');
      const method2 = String(d.payment_method || 'cash').toLowerCase();
      if (method2 === 'credit' && !String(d.customer_name || '').trim()) return err(400, 'Enter the customer name for a credit sale');
      const lines = items.map((it) => ({ p: st.products.find((x) => x.id === parseInt(it.product_id, 10)), qty: parseInt(it.quantity, 10) }));
      for (const l of lines) {
        if (!l.p) return err(404, 'A product in the cart no longer exists');
        if (!(l.qty >= 1)) return err(400, 'Each item needs a quantity of 1 or more');
        if (l.p.stock_quantity < l.qty) return err(400, `Only ${l.p.stock_quantity} of "${l.p.name}" in stock`);
      }
      const subtotal = lines.reduce((t, l) => t + l.p.price * l.qty, 0);
      const discount = Math.min(parseFloat(d.discount) || 0, subtotal);
      const ref = Math.floor(Math.random() * 0xfffff).toString(16).toUpperCase().padStart(5, '0');
      const out = lines.map((l, i) => {
        const share = i === lines.length - 1 ? discount - lines.slice(0, -1).reduce((t, x) => t + (subtotal ? (discount * x.p.price * x.qty) / subtotal : 0), 0) : subtotal ? (discount * l.p.price * l.qty) / subtotal : 0;
        pushSale(l.p, l.qty, d.customer_name || null, method2, ref);
        const row = st.sales[st.sales.length - 1];
        row.discount = Math.round(share * 100) / 100; row.customer_id = d.customer_id ? parseInt(d.customer_id, 10) : null;
        return { ...withProduct(row, st), unit_price: l.p.price };
      });
      if (method2 === 'credit') st.debits.unshift({ id: ++st.seq.debit, customer_name: d.customer_name.trim(), amount: subtotal - discount, description: `Credit sale ${ref}`, notes: null, date_due: null, status: 'Pending', created_at: new Date(now).toISOString() });
      return json(a === 'bulk' ? out : out[0], 201);
    }

    case 'returns': {
      if (method === 'GET') return json([...st.returns].reverse().map((r) => { const s = st.sales.find((x) => x.id === r.sale_id); return { ...r, product_name: st.products.find((p) => p.id === r.product_id)?.name, customer_name: s?.customer_name, payment_method: s?.payment_method }; }));
      const d = data(); const s = st.sales.find((x) => x.id === parseInt(d.sale_id, 10)); const qty = parseInt(d.quantity, 10);
      if (!s || !(qty >= 1)) return err(400, 'sale_id and a quantity of 1 or more are required');
      const done = st.returns.filter((r) => r.sale_id === s.id).reduce((t, r) => t + r.quantity, 0);
      if (qty > s.quantity - done) return err(400, s.quantity - done > 0 ? `Only ${s.quantity - done} left to return on this sale` : 'This sale was already fully returned');
      const r = { id: ++st.seq.ret, sale_id: s.id, product_id: s.product_id, quantity: qty, refund_amount: Math.round(((net(s) / s.quantity) * qty) * 100) / 100, reason: d.reason || null, created_at: new Date(now).toISOString() };
      st.returns.push(r); const p = st.products.find((x) => x.id === s.product_id); if (p) p.stock_quantity += qty;
      return json(r, 201);
    }

    case 'reports': {
      if (a === 'dashboard') {
        const dash = buildDashboard({
          sales: st.sales.map((s) => withProduct(s, st)), products: st.products, debts: st.debits, settings: st.settings, now,
        });
        const extra = st.extraActivity.map((x) => ({ ...x }));
        dash.activity = [...extra, ...dash.activity].sort((x, y) => y.at - x.at).slice(0, 12);
        return json(dash);
      }
      if (a === 'pl') {
        const from = startOf(q.get('period'), now);
        const ss = st.sales.filter((s) => new Date(s.created_at).getTime() >= from).map((s) => withProduct(s, st));
        const rr = st.returns.filter((r) => new Date(r.created_at).getTime() >= from);
        const revenue = ss.reduce((t, s) => t + net(s), 0);
        const cogs = ss.reduce((t, s) => t + s.cost * s.quantity, 0) - rr.reduce((t, r) => t + (st.products.find((p) => p.id === r.product_id)?.cost || 0) * r.quantity, 0);
        const expenses = st.expenses.filter((e) => e.expense_date >= ymd(from + LAGOS)).reduce((t, e) => t + e.amount, 0);
        const refunds = rr.reduce((t, r) => t + r.refund_amount, 0);
        const grossProfit = revenue - refunds - cogs; const netProfit = grossProfit - expenses;
        return json({ revenue, cogs, grossProfit, expenses, refunds, netProfit, transactions: ss.length, margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0 });
      }
      if (a === 'bestsellers') {
        return json(st.products.map((p) => { const ss = st.sales.filter((s) => s.product_id === p.id); return { id: p.id, name: p.name, category: p.category, size: p.size, color: p.color, price: p.price, stock_quantity: p.stock_quantity, units_sold: ss.reduce((t, s) => t + s.quantity, 0), revenue: ss.reduce((t, s) => t + net(s), 0) }; }).sort((x, y) => y.units_sold - x.units_sold).slice(0, 10));
      }
      if (a === 'export' && b === 'sales') return csv('sales', ['Date', 'Product', 'Qty', 'Unit Price', 'Discount', 'Total', 'Customer', 'Payment'], [...st.sales].reverse().map((s) => { const w = withProduct(s, st); return [s.created_at.slice(0, 10), w.product_name, s.quantity, s.sale_price, s.discount, net(s), s.customer_name, s.payment_method]; }));
      if (a === 'export' && b === 'products') return csv('products', ['Name', 'Category', 'Size', 'Color', 'Price', 'Cost', 'Stock'], st.products.map((p) => [p.name, p.category, p.size, p.color, p.price, p.cost, p.stock_quantity]));
      if (a === 'export' && b === 'customers') return csv('customers', ['Name', 'Phone', 'Notes'], st.customers.map((c) => [c.name, c.phone, c.notes]));
      return err(404, 'Not found');
    }

    case 'expenses': {
      if (a === 'categories') return json(['Stock Purchase', 'Rent', 'Transport', 'Salary', 'Utilities', 'Marketing', 'General']);
      if (a === 'summary') {
        const today = ymd(now); const mo = today.slice(0, 7);
        const sum = (f) => st.expenses.filter(f).reduce((t, e) => t + e.amount, 0);
        const monthRows = st.expenses.filter((e) => e.expense_date.startsWith(mo));
        const cats = {}; monthRows.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
        return json({ today: sum((e) => e.expense_date === today), thisWeek: sum((e) => e.expense_date >= ymd(startOf('week', now) + LAGOS)), thisMonth: { total: sum((e) => e.expense_date.startsWith(mo)), count: monthRows.length }, byCategory: Object.entries(cats).map(([category, total]) => ({ category, total })).sort((x, y) => y.total - x.total) });
      }
      if (method === 'GET') return json([...st.expenses].sort((x, y) => y.expense_date.localeCompare(x.expense_date) || y.id - x.id));
      if (method === 'DELETE') return remove(st.expenses) ? json({ ok: true }) : err(404, 'Expense not found');
      const d = data(); const amount = parseFloat(d.amount);
      if (!String(d.description || '').trim()) return err(400, 'Description is required');
      if (!(amount > 0)) return err(400, 'Amount must be more than 0');
      const f = { description: d.description.trim(), amount, category: d.category || 'General', expense_date: d.expense_date || ymd(now), notes: d.notes || null };
      if (method === 'POST') { const e = { id: ++st.seq.expense, created_at: new Date(now).toISOString(), ...f }; st.expenses.push(e); return json(e, 201); }
      const e = find(st.expenses); if (!e) return err(404, 'Expense not found'); Object.assign(e, f); return json(e);
    }

    case 'debits': {
      if (a === 'summary') { const p = st.debits.filter((x) => x.status === 'Pending'); return json({ totalOutstanding: p.reduce((t, x) => t + x.amount, 0), count: p.length }); }
      if (method === 'GET') return json([...st.debits].sort((x, y) => y.created_at.localeCompare(x.created_at)));
      if (b === 'clear') { const x = find(st.debits); if (!x) return err(404, 'Debt not found'); x.status = 'Cleared'; return json(x); }
      if (method === 'DELETE') return remove(st.debits) ? json({ ok: true }) : err(404, 'Debt not found');
      const d = data(); const amount = parseFloat(d.amount);
      if (!String(d.customer_name || '').trim()) return err(400, 'Customer name is required');
      if (!(amount > 0)) return err(400, 'Amount must be more than 0');
      const x = { id: ++st.seq.debit, customer_name: d.customer_name.trim(), amount, description: d.description || null, notes: d.notes || null, date_due: d.date_due || null, status: 'Pending', created_at: new Date(now).toISOString() };
      st.debits.unshift(x); return json(x, 201);
    }

    case 'invoices': {
      if (method === 'GET' && !a) return json([...st.invoices].sort((x, y) => y.created_at.localeCompare(x.created_at)));
      if (method === 'GET') { const x = find(st.invoices); return x ? json(x) : err(404, 'Invoice not found'); }
      if (b === 'status') { const x = find(st.invoices); if (!x) return err(404, 'Invoice not found'); if (!['Draft', 'Sent', 'Paid'].includes(data().status)) return err(400, 'Invalid status'); x.status = data().status; return json(x); }
      if (method === 'DELETE') return remove(st.invoices) ? json({ ok: true }) : err(404, 'Invoice not found');
      const d = data();
      if (!String(d.customer_name || '').trim()) return err(400, 'Customer name is required');
      if (!Array.isArray(d.items) || !d.items.length) return err(400, 'Add at least one line item');
      const items = d.items.map((i) => ({ description: String(i.description || '').trim(), quantity: Math.max(1, parseInt(i.quantity, 10) || 1), unit_price: Math.max(0, parseFloat(i.unit_price) || 0) }));
      if (items.some((i) => !i.description)) return err(400, 'Every line needs a description');
      const x = { id: ++st.seq.invoice, customer_name: d.customer_name.trim(), items, total: items.reduce((t, i) => t + i.quantity * i.unit_price, 0), status: 'Draft', created_at: new Date(now).toISOString() };
      st.invoices.unshift(x); return json(x, 201);
    }

    case 'messages': {
      if (!a) {
        const by = {}; st.messages.forEach((m) => { (by[m.phone_number] ||= []).push(m); });
        return json(Object.entries(by).map(([phone, ms]) => { const last = ms[ms.length - 1]; return { phone_number: phone, message_count: ms.length, last_message_time: last.created_at, last_message: last.message_text, last_direction: last.direction }; }).sort((x, y) => y.last_message_time.localeCompare(x.last_message_time)));
      }
      return json(st.messages.filter((m) => m.phone_number === a));
    }

    case 'whatsapp':
      if (a === 'status') return json({ status: 'connected' });
      if (a === 'qr') return json({ qr: null, status: 'connected' });
      return json({ success: true, status: 'connected' });

    default:
      return err(404, 'Not found');
  }
}
