import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Clock, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [summary, setSummary] = useState({ today: { total: 0, count: 0 }, thisWeek: { total: 0, count: 0 }, thisMonth: { total: 0 } });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [storeName, setStoreName] = useState('My Store');
  const navigate = useNavigate();

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  useEffect(() => {
    Promise.all([
      fetch('/api/sales/summary').then(r => r.json()),
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([sum, sales, products, settings]) => {
      setSummary(sum);
      setRecentSales((sales || []).slice(0, 5));
      setLowStock((products || []).filter(p => p.stock_quantity <= 5));
      if (settings?.store_name) setStoreName(settings.store_name);
    }).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-sm text-gray-500">{greeting}</p>
        <h1 className="text-2xl font-bold text-gray-900">{storeName}</h1>
      </div>

      {/* Today's Revenue Card */}
      <div className="bg-violet-600 rounded-2xl p-5 mb-4 text-white shadow-lg">
        <p className="text-violet-200 text-sm mb-1">Today's Revenue</p>
        <p className="text-4xl font-bold tracking-tight">{fmt(summary.today?.total)}</p>
        <p className="text-violet-200 text-sm mt-1">{summary.today?.count || 0} sales today</p>
        <div className="flex gap-6 mt-4 pt-4 border-t border-violet-500">
          <div>
            <p className="text-violet-300 text-xs">This Week</p>
            <p className="font-semibold text-sm">{fmt(summary.thisWeek?.total)}</p>
          </div>
          <div>
            <p className="text-violet-300 text-xs">This Month</p>
            <p className="font-semibold text-sm">{fmt(summary.thisMonth?.total)}</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <button
        onClick={() => navigate('/sales')}
        className="w-full bg-gray-900 hover:bg-gray-800 active:scale-95 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-semibold text-base mb-6 transition-all shadow"
      >
        <div className="bg-violet-500 rounded-lg p-1"><Plus size={18} /></div>
        Make a Sale
      </button>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => navigate('/inventory')} className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-violet-300 transition-colors shadow-sm">
          <div className="bg-violet-50 rounded-lg p-2 w-fit mb-2"><Package size={18} className="text-violet-600" /></div>
          <p className="text-xs text-gray-500">Total Products</p>
          <p className="text-xl font-bold text-gray-900">{lowStock.length > 0 ? <span className="text-amber-600">{lowStock.length} low</span> : 'All good'}</p>
          <p className="text-xs text-violet-600 mt-1">View inventory →</p>
        </button>
        <button onClick={() => navigate('/sales')} className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-violet-300 transition-colors shadow-sm">
          <div className="bg-emerald-50 rounded-lg p-2 w-fit mb-2"><ShoppingCart size={18} className="text-emerald-600" /></div>
          <p className="text-xs text-gray-500">Week Sales</p>
          <p className="text-xl font-bold text-gray-900">{summary.thisWeek?.count || 0}</p>
          <p className="text-xs text-emerald-600 mt-1">View all sales →</p>
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{[p.category, p.size, p.color].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-700 font-bold text-sm">{p.stock_quantity} left</p>
                  <button onClick={() => navigate('/inventory')} className="text-xs text-violet-600">Restock →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Recent Sales</h2>
        </div>
        {recentSales.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ShoppingCart size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No sales recorded yet</p>
            <button onClick={() => navigate('/sales')} className="mt-3 text-violet-600 text-sm font-medium">Record your first sale →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.product_name}</p>
                  <p className="text-xs text-gray-400">Qty {s.quantity} · {s.payment_method}{s.customer_name ? ` · ${s.customer_name}` : ''}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{fmt(s.sale_price * s.quantity)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
