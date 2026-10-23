// End-to-end API smoke test. Usage: BASE=http://localhost:5000 OWNER_PIN=<owner pin, omit on a fresh store> node scripts/smoke-api.mjs
// Creates clearly-labelled "ZZ Test" rows and removes them again. Run against an empty/dev store.
const BASE = (process.env.BASE || 'http://localhost:5000') + '/api';
let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
  if (!cond) failed++;
};
async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  return { status: res.status, data };
}
const login = async (role, pin) => (await call('POST', '/settings/verify-pin', { body: { role, pin } })).data?.token;

const owner = await login('owner', process.env.OWNER_PIN || '0000');
check('owner can sign in on a fresh store', !!owner);
await call('PUT', '/settings', { token: owner, body: { manager_pin: '2222', staff_pin: '3333' } });
const manager = await login('manager', '2222');
const staff = await login('staff', '3333');
check('manager and staff sign in with their PINs', !!manager && !!staff);
check('wrong PIN is rejected', (await call('POST', '/settings/verify-pin', { body: { role: 'staff', pin: '9999' } })).status === 401);

check('no token -> 401', (await call('GET', '/products')).status === 401);
check('staff cannot read expenses', (await call('GET', '/expenses', { token: staff })).status === 403);
check('staff cannot create products', (await call('POST', '/products', { token: staff, body: { name: 'x', price: 1 } })).status === 403);
check('staff cannot change settings', (await call('PUT', '/settings/store_name', { token: staff, body: { value: 'x' } })).status === 403);
check('staff cannot read reports', (await call('GET', '/reports/pl', { token: staff })).status === 403);
check('manager can read reports', (await call('GET', '/reports/pl?period=month', { token: manager })).status === 200);
check('forged token rejected', (await call('GET', '/products', { token: owner.slice(0, -3) + 'abc' })).status === 401);

const p = (await call('POST', '/products', { token: manager, body: { name: 'ZZ Test Dress', category: 'Dresses', size: 'M', color: 'Blue', price: 10000, cost: 6000, stock_quantity: 5 } })).data;
check('manager creates a product', p?.id && p.stock_quantity === 5, JSON.stringify(p));
check('negative price rejected', (await call('POST', '/products', { token: manager, body: { name: 'bad', price: -5 } })).status === 400);

const sale = await call('POST', '/sales/bulk', { token: staff, body: { items: [{ product_id: p.id, quantity: 2 }], payment_method: 'cash', discount: 1000 } });
check('staff completes a sale', sale.status === 201 && sale.data?.[0]?.discount === 1000, JSON.stringify(sale.data));
check('stock dropped 5 -> 3', (await call('GET', `/products/${p.id}`, { token: staff })).data?.stock_quantity === 3);
check('cannot oversell', (await call('POST', '/sales/bulk', { token: staff, body: { items: [{ product_id: p.id, quantity: 10 }] } })).status === 400);
check('stock unchanged after failed oversell', (await call('GET', `/products/${p.id}`, { token: staff })).data?.stock_quantity === 3);
check('price is taken from the product, not the client', (await call('POST', '/sales/bulk', { token: staff, body: { items: [{ product_id: p.id, quantity: 1, price: 1 }], payment_method: 'transfer' } })).data?.[0]?.sale_price === 10000);

const credit = await call('POST', '/sales/bulk', { token: staff, body: { items: [{ product_id: p.id, quantity: 1 }], payment_method: 'credit', customer_name: 'ZZ Test Buyer' } });
check('credit sale works', credit.status === 201);
const debits = (await call('GET', '/debits', { token: owner })).data || [];
const debt = debits.find((d) => d.customer_name === 'ZZ Test Buyer');
check('credit sale created a debt of ₦10,000', debt?.amount === 10000, JSON.stringify(debt));
check('credit sale without a customer name is rejected', (await call('POST', '/sales/bulk', { token: staff, body: { items: [{ product_id: p.id, quantity: 1 }], payment_method: 'credit' } })).status === 400);

const saleId = sale.data[0].id;
check('return 1 unit', (await call('POST', '/returns', { token: staff, body: { sale_id: saleId, quantity: 1, reason: 'ZZ test' } })).data?.refund_amount === 9500);
check('stock restored by return', (await call('GET', `/products/${p.id}`, { token: staff })).data?.stock_quantity === 2);
check('cannot return more than sold', (await call('POST', '/returns', { token: staff, body: { sale_id: saleId, quantity: 5 } })).status === 400);

const summary = (await call('GET', '/sales/summary', { token: staff })).data;
check('sales summary counts today', summary?.today?.count >= 3 && summary.today.total > 0, JSON.stringify(summary));
check('best sellers list loads', Array.isArray((await call('GET', '/reports/bestsellers', { token: manager })).data));

const exp = (await call('POST', '/expenses', { token: owner, body: { description: 'ZZ Test expense', amount: 500, category: 'General' } })).data;
check('owner adds an expense', exp?.id && exp.expense_date?.length === 10, JSON.stringify(exp));
check('expense with zero amount rejected', (await call('POST', '/expenses', { token: owner, body: { description: 'x', amount: 0 } })).status === 400);

const inv = (await call('POST', '/invoices', { token: owner, body: { customer_name: 'ZZ Test', total: 1, items: [{ description: 'Dress', quantity: 2, unit_price: 2500 }] } })).data;
check('invoice total is computed server-side (₦5,000, not the ₦1 sent)', inv?.total === 5000, JSON.stringify(inv));
check('invoice status can be updated', (await call('PUT', `/invoices/${inv.id}/status`, { token: owner, body: { status: 'Sent' } })).data?.status === 'Sent');

const csv = await fetch(BASE + '/reports/export/sales', { headers: { authorization: `Bearer ${manager}` } });
check('CSV export downloads', csv.status === 200 && (await csv.text()).startsWith('Date,Product'));

// ── cleanup ──
for (const s of (await call('GET', '/sales?limit=50', { token: staff })).data.filter((s) => s.product_id === p.id)) {
  await call('DELETE', `/sales/${s.id}`, { token: manager });
}
check('voiding sales puts stock back (back to 5)', (await call('GET', `/products/${p.id}`, { token: staff })).data?.stock_quantity === 5);
await call('DELETE', `/products/${p.id}`, { token: manager });
await call('DELETE', `/expenses/${exp.id}`, { token: owner });
await call('DELETE', `/invoices/${inv.id}`, { token: owner });
for (const d of (await call('GET', '/debits', { token: owner })).data.filter((d) => d.customer_name === 'ZZ Test Buyer')) {
  await call('DELETE', `/debits/${d.id}`, { token: owner });
}
await call('PUT', '/settings', { token: owner, body: { manager_pin: '', staff_pin: '' } });

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
