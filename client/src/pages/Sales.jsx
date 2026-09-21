import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, X, ShoppingBag, CheckCircle, MessageCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

const PAYMENT_METHODS = ['Cash', 'Transfer', 'POS'];

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({ today: { total: 0, count: 0 }, thisWeek: { total: 0, count: 0 }, thisMonth: { total: 0 } });
  const [recentSales, setRecentSales] = useState([]);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState('Cash');
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [discount, setDiscount] = useState('');
  const [returnModal, setReturnModal] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const searchRef = useRef();

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const loadData = async () => {
    const [sumRes, salesRes, prodRes, custRes] = await Promise.all([
      apiFetch('/api/sales/summary').then(r => r.json()),
      apiFetch('/api/sales').then(r => r.json()),
      apiFetch('/api/products').then(r => r.json()),
      apiFetch('/api/customers').then(r => r.json()),
    ]);
    setSummary(sumRes);
    setRecentSales(salesRes);
    setProducts(prodRes);
    setCustomers(custRes);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = products.filter(p =>
    p.stock_quantity > 0 &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.category || '').toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, max: product.stock_quantity, size: product.size, color: product.color }];
    });
    setSearch('');
    setShowResults(false);
  };

  const updateQty = (product_id, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === product_id ? { ...i, quantity: Math.min(i.max, Math.max(0, i.quantity + delta)) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const discountAmt = parseFloat(discount) || 0;
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));

  const selectCustomer = (c) => {
    setCustomerId(c.id);
    setCustomer(c.name);
    setCustomerSearch(c.name);
    setShowCustomerList(false);
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    const res = await apiFetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale_id: returnModal.id, quantity: returnQty, reason: returnReason }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setReturnModal(null);
    setReturnQty(1);
    setReturnReason('');
    loadData();
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    setError('');
    setLoading(true);
    const res = await apiFetch('/api/sales/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name: customer || null,
        customer_id: customerId || null,
        payment_method: payment.toLowerCase(),
        discount: discountAmt,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Sale failed'); setLoading(false); return; }
    setReceipt({ items: [...cart], total: total - discountAmt, payment, customer, discount: discountAmt });
    setCart([]);
    setCustomer('');
    setCustomerId(null);
    setCustomerSearch('');
    setDiscount('');
    setPayment('Cash');
    loadData();
    setLoading(false);
  };

  const sendWhatsApp = (phone = '') => {
    const lines = [
      `*Receipt*`,
      `─────────────────`,
      ...receipt.items.map(i => {
        const detail = [i.size, i.color].filter(Boolean).join(', ');
        return `${i.name}${detail ? ` (${detail})` : ''} x${i.quantity}  ${fmt(i.price * i.quantity)}`;
      }),
      `─────────────────`,
      `*Total: ${fmt(receipt.total)}*`,
      `Payment: ${receipt.payment}`,
      receipt.customer ? `Customer: ${receipt.customer}` : '',
      ``,
      `Thank you! 🙏`,
    ].filter(l => l !== undefined && !(l === '' && !receipt.customer)).join('\n');

    const url = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  if (receipt) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-emerald-50 rounded-full p-4 mb-4">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Sale Complete!</h2>
        <p className="text-gray-500 text-sm mb-6">{receipt.payment} payment{receipt.customer ? ` · ${receipt.customer}` : ''}</p>

        <div className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
          {receipt.items.map(i => (
            <div key={i.product_id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium text-gray-900 text-sm">{i.name}</p>
                <p className="text-xs text-gray-400">{[i.size, i.color].filter(Boolean).join(' · ')} x{i.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{fmt(i.price * i.quantity)}</p>
            </div>
          ))}
          <div className="flex justify-between pt-3 mt-1">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-xl text-violet-700">{fmt(receipt.total)}</span>
          </div>
        </div>

        {/* WhatsApp send */}
        <button
          onClick={() => sendWhatsApp()}
          className="w-full bg-[#25D366] hover:bg-[#20b558] active:scale-95 text-white rounded-2xl py-4 font-semibold text-base flex items-center justify-center gap-3 mb-3 transition-all"
        >
          <MessageCircle size={20} />
          Send Receipt on WhatsApp
        </button>

        <button
          onClick={() => setReceipt(null)}
          className="w-full bg-gray-900 text-white rounded-2xl py-3 font-semibold text-base"
        >
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-violet-50 rounded-2xl p-3">
          <p className="text-xs text-violet-500 mb-0.5">Today</p>
          <p className="text-base font-bold text-violet-900">{fmt(summary.today?.total)}</p>
          <p className="text-xs text-violet-400">{summary.today?.count || 0} sales</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-3">
          <p className="text-xs text-emerald-500 mb-0.5">This Week</p>
          <p className="text-base font-bold text-emerald-900">{fmt(summary.thisWeek?.total)}</p>
          <p className="text-xs text-emerald-400">{summary.thisWeek?.count || 0} sales</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3">
          <p className="text-xs text-blue-500 mb-0.5">This Month</p>
          <p className="text-base font-bold text-blue-900">{fmt(summary.thisMonth?.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* POS Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Make a Sale</h2>

          {/* Product search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              className="input pl-9"
              placeholder="Search product to add..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
            />
          </div>

          {/* Search results */}
          {showResults && search && (
            <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden shadow-sm">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No products found</p>
              ) : filtered.slice(0, 6).map(p => (
                <button key={p.id} type="button"
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50 active:bg-violet-100 border-b border-gray-50 last:border-0 transition-colors">
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{[p.category, p.size, p.color].filter(Boolean).join(' · ')} · {p.stock_quantity} left</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-violet-700 text-sm">{fmt(p.price)}</p>
                    <p className="text-xs text-emerald-600">+ Add</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Cart */}
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <ShoppingBag size={40} className="mx-auto mb-2" />
              <p className="text-sm">Search and tap a product to add it</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="font-bold text-sm text-gray-900 w-20 text-right">{fmt(item.price * item.quantity)}</p>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-400 ml-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <>
              {/* Total */}
              <div className="flex justify-between items-center bg-gray-900 text-white rounded-xl px-4 py-3 mb-4">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">{fmt(total)}</span>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button"
                    onClick={() => setPayment(m)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${payment === m ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Discount */}
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                <input className="input pl-7" type="number" min="0" placeholder="Discount amount (optional)"
                  value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>

              {/* Customer from database */}
              <div className="relative mb-3">
                <input className="input" placeholder="Customer (type to search or add name)"
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setCustomer(e.target.value); setCustomerId(null); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)} />
                {showCustomerList && customerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                    {filteredCustomers.slice(0, 5).map(c => (
                      <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-violet-50 text-sm border-b border-gray-50 last:border-0">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {discountAmt > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-500 px-1 mb-2">
                  <span>Subtotal</span><span>{fmt(total)}</span>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{error}</p>}

              <button onClick={completeSale} disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl py-4 font-bold text-base transition-all disabled:opacity-50">
                {loading ? 'Processing…' : `Complete Sale · ${fmt(total - discountAmt)}`}
              </button>
            </>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSales.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No sales yet</p>
            ) : recentSales.slice(0, 20).map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{s.product_name}</p>
                  <p className="text-xs text-gray-400">
                    x{s.quantity} · <span className="capitalize">{s.payment_method}</span>
                    {s.customer_name ? ` · ${s.customer_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <p className="font-bold text-gray-900 text-sm">{fmt(s.sale_price * s.quantity)}</p>
                  <button onClick={() => { setReturnModal(s); setReturnQty(1); setReturnReason(''); }}
                    className="text-xs text-orange-500 border border-orange-200 px-2 py-0.5 rounded-lg flex-shrink-0">
                    Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Return modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-lg mb-1">Process Return</h3>
            <p className="text-sm text-gray-500 mb-4">{returnModal.product_name} · sold x{returnModal.quantity}</p>
            <label className="label">Quantity to return</label>
            <input className="input mb-3" type="number" min="1" max={returnModal.quantity} value={returnQty}
              onChange={e => setReturnQty(parseInt(e.target.value))} />
            <label className="label">Reason (optional)</label>
            <input className="input mb-4" placeholder="e.g. wrong size, defective" value={returnReason}
              onChange={e => setReturnReason(e.target.value)} />
            <p className="text-sm text-gray-500 mb-4">Refund: <strong>{fmt(returnModal.sale_price * returnQty)}</strong> · Stock will be restored</p>
            <div className="flex gap-3">
              <button onClick={() => setReturnModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleReturn} className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold">Confirm Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
