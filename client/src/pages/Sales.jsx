import { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Calendar, Search, X, ChevronDown } from 'lucide-react';

const PAYMENT_METHODS = ['cash', 'transfer', 'POS'];
const EMPTY_FORM = { product_id: '', quantity: 1, sale_price: '', customer_name: '', payment_method: 'cash' };

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ today: { total: 0, count: 0 }, thisWeek: { total: 0, count: 0 }, thisMonth: { total: 0 } });
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const reload = async () => {
    const [salesRes, summaryRes, productsRes] = await Promise.all([
      fetch('/api/sales'),
      fetch('/api/sales/summary'),
      fetch('/api/products'),
    ]);
    setSales(await salesRes.json());
    setSummary(await summaryRes.json());
    setProducts(await productsRes.json());
  };

  useEffect(() => { reload(); }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock_quantity > 0
  );

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setForm(f => ({ ...f, product_id: p.id, sale_price: p.price }));
    setProductSearch(p.name);
    setShowProductList(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantity: parseInt(form.quantity), sale_price: parseFloat(form.sale_price) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Sale failed'); setLoading(false); return; }
    setForm(EMPTY_FORM);
    setSelectedProduct(null);
    setProductSearch('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    reload();
    setLoading(false);
  };

  const subtotal = (form.quantity || 0) * (parseFloat(form.sale_price) || 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Sales</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5">
        <div className="bg-violet-50 rounded-2xl p-3 md:p-5">
          <p className="text-xs text-violet-500 mb-1">Today</p>
          <p className="text-lg md:text-2xl font-bold text-violet-900">{fmt(summary.today?.total)}</p>
          <p className="text-xs text-violet-400">{summary.today?.count || 0} sales</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-3 md:p-5">
          <p className="text-xs text-emerald-500 mb-1">This Week</p>
          <p className="text-lg md:text-2xl font-bold text-emerald-900">{fmt(summary.thisWeek?.total)}</p>
          <p className="text-xs text-emerald-400">{summary.thisWeek?.count || 0} sales</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 md:p-5">
          <p className="text-xs text-blue-500 mb-1">This Month</p>
          <p className="text-lg md:text-2xl font-bold text-blue-900">{fmt(summary.thisMonth?.total)}</p>
          <p className="text-xs text-blue-400">total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Record Sale Form */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Record Sale</h2>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
              Sale recorded!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product picker */}
            <div>
              <label className="label">Product *</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="input pl-9 pr-8"
                  placeholder="Search product…"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductList(true); setSelectedProduct(null); setForm(f => ({ ...f, product_id: '' })); }}
                  onFocus={() => setShowProductList(true)}
                />
                {productSearch && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => { setProductSearch(''); setSelectedProduct(null); setForm(f => ({ ...f, product_id: '' })); }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {showProductList && productSearch && (
                <div className="border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto bg-white">
                  {filteredProducts.length === 0
                    ? <p className="p-4 text-sm text-gray-400 text-center">No in-stock products match</p>
                    : filteredProducts.map(p => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0"
                        onClick={() => selectProduct(p)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{[p.category, p.size, p.color].filter(Boolean).join(' · ')} &bull; {p.stock_quantity} in stock</p>
                          </div>
                          <span className="text-sm font-bold text-violet-700">{fmt(p.price)}</span>
                        </div>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Qty + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity *</label>
                <input className="input text-center text-lg font-semibold" type="number" min="1" required
                  value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="label">Price (₦) *</label>
                <input className="input text-lg font-semibold" type="number" min="0" step="0.01" required
                  value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="label">Payment</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.payment_method === m ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                    onClick={() => setForm(f => ({ ...f, payment_method: m }))}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer name (optional) */}
            <div>
              <label className="label">Customer <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="Customer name" value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>

            {/* Subtotal */}
            {subtotal > 0 && (
              <div className="bg-violet-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-violet-600 font-medium">Total</span>
                <span className="text-xl font-bold text-violet-900">{fmt(subtotal)}</span>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

            <button type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 active:scale-95 text-white rounded-xl py-4 font-semibold text-base transition-all disabled:opacity-50"
              disabled={loading || !form.product_id}>
              {loading ? 'Recording…' : 'Record Sale'}
            </button>
          </form>
        </div>

        {/* Sales History */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-gray-50">
            {sales.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No sales yet</p>
            ) : sales.slice(0, 20).map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.product_name}</p>
                  <p className="text-xs text-gray-400">Qty {s.quantity} · <span className="capitalize">{s.payment_method}</span>{s.customer_name ? ` · ${s.customer_name}` : ''}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{fmt(s.sale_price * s.quantity)}</p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Qty</th>
                  <th className="table-th">Price</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.length === 0 ? (
                  <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">No sales yet</td></tr>
                ) : sales.slice(0, 20).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <p className="font-medium text-gray-900">{s.product_name}</p>
                      {s.customer_name && <p className="text-xs text-gray-400">{s.customer_name}</p>}
                    </td>
                    <td className="table-td">{s.quantity}</td>
                    <td className="table-td">{fmt(s.sale_price)}</td>
                    <td className="table-td font-semibold">{fmt(s.sale_price * s.quantity)}</td>
                    <td className="table-td"><span className="badge-blue capitalize">{s.payment_method}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
