import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Clock, TrendingUp, Package, ShoppingCart, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Home() {
  const [summary, setSummary] = useState({ today: { total: 0, count: 0 }, thisWeek: { total: 0, count: 0 }, thisMonth: { total: 0 } });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [storeName, setStoreName] = useState('My Store');
  const [peakHours, setPeakHours] = useState([]);
  const navigate = useNavigate();

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  useEffect(() => {
    Promise.all([
      apiFetch('/api/sales/summary').then(r => r.json()),
      apiFetch('/api/sales').then(r => r.json()),
      apiFetch('/api/products').then(r => r.json()),
      apiFetch('/api/settings').then(r => r.json()),
      apiFetch('/api/sales/peak-hours').then(r => r.json()),
    ]).then(([sum, sales, products, settings, hours]) => {
      setSummary(sum);
      setRecentSales((sales || []).slice(0, 5));
      setLowStock((products || []).filter(p => p.stock_quantity <= 5));
      if (settings?.store_name) setStoreName(settings.store_name);
      if (Array.isArray(hours)) setPeakHours(hours);
    }).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-50">{greeting}, {storeName}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Here's how your store is doing today</p>
      </div>

      {/* Today's Revenue Card */}
      <div className="bg-emerald-600 rounded-2xl p-5 mb-4 text-white shadow-lg">
        <p className="text-emerald-200 text-sm mb-1">Today's Revenue</p>
        <p className="text-4xl font-bold tracking-tight">{fmt(summary.today?.total)}</p>
        <p className="text-emerald-200 text-sm mt-1">{summary.today?.count || 0} sales today</p>
        <div className="flex gap-6 mt-4 pt-4 border-t border-emerald-500">
          <div>
            <p className="text-emerald-300 text-xs">This Week</p>
            <p className="font-semibold text-sm">{fmt(summary.thisWeek?.total)}</p>
          </div>
          <div>
            <p className="text-emerald-300 text-xs">This Month</p>
            <p className="font-semibold text-sm">{fmt(summary.thisMonth?.total)}</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <button
        onClick={() => navigate('/sales')}
        className="w-full bg-zinc-950 hover:bg-zinc-700 active:scale-95 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-semibold text-base mb-6 transition-all shadow"
      >
        <div className="bg-emerald-500 rounded-lg p-1"><Plus size={18} /></div>
        Make a Sale
      </button>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => navigate('/inventory')} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-emerald-300 transition-colors shadow-sm">
          <div className="bg-emerald-50 rounded-lg p-2 w-fit mb-2"><Package size={18} className="text-emerald-600" /></div>
          <p className="text-xs text-zinc-400">Total Products</p>
          <p className="text-xl font-bold text-zinc-50">{lowStock.length > 0 ? <span className="text-amber-600">{lowStock.length} low</span> : 'All good'}</p>
          <p className="text-xs text-emerald-600 mt-1">View inventory →</p>
        </button>
        <button onClick={() => navigate('/sales')} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-emerald-300 transition-colors shadow-sm">
          <div className="bg-emerald-50 rounded-lg p-2 w-fit mb-2"><ShoppingCart size={18} className="text-emerald-600" /></div>
          <p className="text-xs text-zinc-400">Week Sales</p>
          <p className="text-xl font-bold text-zinc-50">{summary.thisWeek?.count || 0}</p>
          <p className="text-xs text-emerald-600 mt-1">View all sales →</p>
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="font-semibold text-zinc-50 text-sm">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-50 text-sm">{p.name}</p>
                  <p className="text-xs text-zinc-400">{[p.category, p.size, p.color].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-700 font-bold text-sm">{p.stock_quantity} left</p>
                  <button onClick={() => navigate('/inventory')} className="text-xs text-emerald-600">Restock →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Hours Chart */}
      <PeakHoursChart data={peakHours} />

      {/* Recent Sales */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-zinc-500" />
          <h2 className="font-semibold text-zinc-50 text-sm">Recent Sales</h2>
        </div>
        {recentSales.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            <ShoppingCart size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No sales recorded yet</p>
            <button onClick={() => navigate('/sales')} className="mt-3 text-emerald-600 text-sm font-medium">Record your first sale →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="font-medium text-zinc-50 text-sm">{s.product_name}</p>
                  <p className="text-xs text-zinc-500">Qty {s.quantity} · {s.payment_method}{s.customer_name ? ` · ${s.customer_name}` : ''}</p>
                </div>
                <p className="font-bold text-zinc-50 text-sm">{fmt(s.sale_price * s.quantity)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PeakHoursChart({ data }) {
  const currentHour = new Date().getHours();
  const hasData = data.some(d => d.count > 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];
  const fmt12 = (h) => {
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h < 12 ? `${h}a` : `${h - 12}p`;
  };

  const peak = data.length > 0
    ? data.reduce((best, d) => (d.count > best.count ? d : best), { hour: -1, count: 0 })
    : { hour: -1, count: 0 };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-amber-400" />
          <h2 className="font-semibold text-zinc-50 text-sm">Sales Traffic</h2>
        </div>
        <span className="text-xs text-zinc-500">last 7 days</span>
      </div>

      {!hasData ? (
        <div className="text-center py-6 text-zinc-600 text-xs">No sales data yet — chart fills as you record sales</div>
      ) : (
        <>
          {peak.count > 0 && (
            <p className="text-xs text-zinc-500 mb-3">
              Busiest: <span className="text-amber-400 font-semibold">{fmt12(peak.hour)}–{fmt12((peak.hour + 1) % 24)}</span>
              <span className="text-zinc-600"> · {peak.count} sale{peak.count !== 1 ? 's' : ''}</span>
            </p>
          )}

          <div className="flex items-end gap-[2px] h-20">
            {data.map(({ hour, count }) => {
              const heightPct = count === 0 ? 4 : Math.max(8, Math.round((count / maxCount) * 100));
              const isPeak = count === maxCount && count > 0;
              const isCurrent = hour === currentHour;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: '100%' }}>
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-700 text-zinc-100 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {fmt12(hour)}: {count}
                  </div>
                  <div
                    className={`w-full rounded-sm transition-all ${
                      isPeak ? 'bg-amber-400' : isCurrent ? 'bg-emerald-500' : count === 0 ? 'bg-zinc-800' : 'bg-emerald-700/70'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex mt-1" style={{ gap: '2px' }}>
            {data.map(({ hour }) => (
              <div key={hour} className="flex-1 text-center">
                {labelHours.includes(hour) && (
                  <span className="text-[9px] text-zinc-600">{fmt12(hour)}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-amber-400" />
              <span className="text-[10px] text-zinc-500">Busiest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-zinc-500">Now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-emerald-700/70" />
              <span className="text-[10px] text-zinc-500">Active</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

