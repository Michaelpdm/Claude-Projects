import { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Calendar, Search, X } from 'lucide-react';

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
    reload();
    setLoading(false);
  };

  const subtotal = (form.quantity || 0) * (parseFloat(form.sale_price) || 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Sales</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Today's Sales</p>
            <div className="bg-violet-50 rounded-lg p-2"><ShoppingCart size={18} className="text-violet-600" /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{fmt(summary.today?.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.today?.count || 0} transactions</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">This Week</p>
            <div className="bg-emerald-50 rounded-lg p-2"><Calendar size={18} className="text-emerald-600" /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{fmt(summary.thisWeek?.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.thisWeek?.count || 0} transactions</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">This Month</p>
            <div className="bg-blue-50 rounded-lg p-2"><TrendingUp size={18} className="text-blue-600" /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{fmt(summary.thisMonth?.total)}</p>
          <p className="text-xs text-gray-400 mt-1">total revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Sale */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Record Sale</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product search */}
            <div className="relative">
              <label className="label">Product *</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9"
                  placeholder="Search and select product&hellip;"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductList(true); setSelectedProduct(null); setForm(f => ({ ...f, product_id: '' })); }}
                  onFocus={() => setShowProductList(true)}
                />
                {productSearch && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => { setProductSearch(''); setSelectedProduct(null); setForm(f => ({ ...f, product_id: '' })); }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {showProductList && productSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.length === 0
                    ? <p className="p-3 text-sm text-gray-400">No in-stock products found</p>
                    : filteredProducts.map(p => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-violet-50 transition-colors"
                        onClick={() => selectProduct(p)}>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category} &bull; Stock: {p.stock_quantity} &bull; <span className="font-semibold">{fmt(p.price)}</span></p>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity *</label>
                <input className="input" type="number" min="1" required value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sale Price (₦) *</label>
                <input className="input" type="number" min="0" step="0.01" required value={form.sale_price}
                  onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Customer Name</label>
              <input className="input" placeholder="Optional" value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>

            <div>
              <label className="label">Payment Method</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button"
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.payment_method === m ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'}`}
                    onClick={() => setForm(f => ({ ...f, payment_method: m }))}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {subtotal > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span></div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading || !form.product_id}>
              {loading ? 'Recording…' : 'Record Sale'}
            </button>
          </form>
        </div>

        {/* Sales Log */}
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
          </div>
          <div className="overflow-x-auto">
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
