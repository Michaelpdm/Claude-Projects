// Pure dashboard maths, shared by the real API (rows from Postgres) and Demo Mode (in-memory rows).
// No imports and no Node-only APIs, so the browser bundle can use it too.
const LAGOS_MS = 3600000; // Africa/Lagos is UTC+1 all year
const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const L = (ts) => new Date(ts + LAGOS_MS);
const dayKey = (ts) => L(ts).toISOString().slice(0, 10);
const hourOf = (ts) => L(ts).getUTCHours();
const dowOf = (ts) => (L(ts).getUTCDay() + 6) % 7; // Monday = 0
const hourLabel = (h) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
const dayLabel = (key) => `${MONTHS[parseInt(key.slice(5, 7), 10) - 1]} ${parseInt(key.slice(8, 10), 10)}`;
const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const greetingFor = (ts) => {
  const h = hourOf(ts);
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/**
 * sales: [{id, order_ref, created_at, quantity, sale_price, discount, payment_method, customer_name,
 *          product_name, category, cost}]
 * products: [{id, name, size, color, stock_quantity, low_stock_threshold}]
 * debts: [{amount, status}]
 * settings: {store_name, daily_target}
 */
export function buildDashboard({ sales, products, debts, settings, now }) {
  const rows = sales.map((s) => ({
    ...s,
    t: new Date(s.created_at).getTime(),
    net: s.sale_price * s.quantity - (s.discount || 0),
    cost: (s.cost || 0) * s.quantity,
    order: s.order_ref || `#${s.id}`,
  }));

  const target = parseFloat(settings.daily_target) || 0;
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  const sameTimeYesterday = now - DAY;

  const sum = (list, f) => list.reduce((a, r) => a + f(r), 0);
  const stats = (list) => {
    const revenue = sum(list, (r) => r.net);
    const orders = new Set(list.map((r) => r.order)).size;
    return { revenue, orders, items: sum(list, (r) => r.quantity), profit: revenue - sum(list, (r) => r.cost) };
  };

  const todayRows = rows.filter((r) => dayKey(r.t) === today);
  const yRows = rows.filter((r) => dayKey(r.t) === yesterday && r.t <= sameTimeYesterday);
  const td = stats(todayRows);
  const yd = stats(yRows);
  const aov = td.orders ? td.revenue / td.orders : 0;
  const yAov = yd.orders ? yd.revenue / yd.orders : 0;
  const pending = sum(debts.filter((d) => d.status === 'Pending'), (d) => d.amount);
  const cleared = sum(debts.filter((d) => d.status === 'Cleared'), (d) => d.amount);

  // hourly (today)
  const nowH = hourOf(now);
  const hourly = [];
  for (let h = Math.min(8, nowH); h <= nowH; h++) {
    const inHour = todayRows.filter((r) => hourOf(r.t) === h);
    const s = stats(inHour);
    hourly.push({ hour: hourLabel(h), revenue: s.revenue, profit: s.profit });
  }

  // last 30 days
  const byDay = new Map();
  for (const r of rows) {
    const k = dayKey(r.t);
    (byDay.get(k) || byDay.set(k, []).get(k)).push(r);
  }
  const days = Array.from({ length: 30 }, (_, i) => dayKey(now - (29 - i) * DAY));
  const daily = days.map((k) => {
    const s = stats(byDay.get(k) || []);
    return { date: dayLabel(k), revenue: s.revenue, profit: s.profit, orders: s.orders };
  });
  const last14 = daily.slice(-14);
  const spark = (key) => last14.map((d, i) => ({ i, v: d[key] }));
  const sparkAov = last14.map((d, i) => ({ i, v: d.orders ? d.revenue / d.orders : 0 }));

  const cutoff30 = now - 30 * DAY;
  const r30 = rows.filter((r) => r.t > cutoff30);

  const group = (list, keyFn, valFn) => {
    const m = new Map();
    for (const r of list) m.set(keyFn(r), (m.get(keyFn(r)) || 0) + valFn(r));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  let categories = group(r30, (r) => r.category || 'Other', (r) => r.net);
  if (categories.length > 6) {
    const rest = categories.slice(5).reduce((a, c) => a + c.value, 0);
    categories = [...categories.slice(0, 5), { name: 'Other', value: rest }];
  }
  const payments = group(r30, (r) => cap(r.payment_method === 'pos' ? 'POS' : r.payment_method), (r) => r.net);

  const prodMap = new Map();
  for (const r of r30) {
    const p = prodMap.get(r.product_name) || { name: r.product_name, units: 0, revenue: 0 };
    p.units += r.quantity;
    p.revenue += r.net;
    prodMap.set(r.product_name, p);
  }
  const top_products = [...prodMap.values()].filter((p) => p.name).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const low_stock = products
    .filter((p) => p.stock_quantity <= (p.low_stock_threshold ?? 3))
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name, variant: [p.size && `Size ${p.size}`, p.color].filter(Boolean).join(' · '), left: p.stock_quantity }));

  // heatmap: weekday x hour (9am-8pm) over 28 days, 0..1
  const grid = Array.from({ length: 7 }, () => Array(12).fill(0));
  for (const r of rows.filter((r) => r.t > now - 28 * DAY)) {
    const h = hourOf(r.t);
    if (h >= 9 && h <= 20) grid[dowOf(r.t)][h - 9] += 1;
  }
  const max = Math.max(1, ...grid.flat());
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmap = grid.map((row, i) => ({ day: names[i], hours: row.map((v) => Math.round((v / max) * 100) / 100) }));

  const monthKey = today.slice(0, 7);
  const monthRevenue = sum(rows.filter((r) => dayKey(r.t).startsWith(monthKey)), (r) => r.net);
  const healthy = products.filter((p) => p.stock_quantity > (p.low_stock_threshold ?? 3)).length;

  const activity = [...rows]
    .sort((a, b) => b.t - a.t || b.id - a.id)
    .slice(0, 12)
    .map((r) => ({
      id: `s${r.id}`, type: 'sale', title: r.product_name || 'Item', at: r.t,
      meta: `${r.customer_name || 'Walk-in'} · ${r.payment_method === 'pos' ? 'POS' : cap(r.payment_method)}`,
      amount: r.net,
    }));

  return {
    now,
    store_name: settings.store_name || 'My Store',
    greeting: greetingFor(now),
    target,
    today: { ...td, aov, sales_count: todayRows.length, debts: pending },
    change: {
      revenue: pct(td.revenue, yd.revenue), orders: pct(td.orders, yd.orders), items: pct(td.items, yd.items),
      aov: pct(aov, yAov), profit: pct(td.profit, yd.profit),
    },
    hourly,
    daily,
    spark: { revenue: spark('revenue'), orders: spark('orders'), profit: spark('profit'), aov: sparkAov },
    categories,
    payments,
    top_products,
    low_stock,
    heatmap,
    rings: {
      daily: target ? (td.revenue / target) * 100 : 0,
      monthly: target ? (monthRevenue / (target * 26)) * 100 : 0,
      stock: products.length ? (healthy / products.length) * 100 : 100,
      debt: cleared + pending > 0 ? (cleared / (cleared + pending)) * 100 : 100,
    },
    activity,
  };
}
