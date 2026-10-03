import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Download, Award } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

export default function Reports() {
  const { isOwner } = useAuth();
  const [period, setPeriod] = useState('month');
  const [pl, setPL] = useState(null);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const load = async () => {
    setLoading(true);
    const [plRes, bsRes] = await Promise.all([
      apiFetch(`/api/reports/pl?period=${period}`).then(r => r.json()),
      apiFetch('/api/reports/bestsellers').then(r => r.json()),
    ]);
    setPL(plRes);
    setBestsellers(bsRes);
    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  const download = (type) => {
    window.open(`/api/reports/export/${type}`, '_blank');
  };

  const plRows = pl ? [
    { label: 'Revenue', value: pl.revenue, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cost of Goods', value: -pl.cogs, color: 'text-red-500', bg: '' },
    { label: 'Refunds', value: -pl.refunds, color: 'text-orange-500', bg: '' },
    { label: 'Gross Profit', value: pl.grossProfit, color: pl.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-zinc-950', bold: true },
    { label: 'Expenses', value: -pl.expenses, color: 'text-red-500', bg: '' },
    { label: 'Net Profit', value: pl.netProfit, color: pl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-emerald-50', bold: true, large: true },
  ] : [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-zinc-50 mb-5">Reports</h1>

      {/* Period selector */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${period === p.key ? 'bg-emerald-600 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-500 text-sm">Loading...</div>
      ) : pl && (
        <>
          {/* P&L Breakdown — owner only */}
          {isOwner && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm mb-5">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h2 className="font-semibold text-zinc-50">Profit & Loss</h2>
                <p className="text-xs text-zinc-500">{pl.transactions} transactions · {pl.margin}% margin</p>
              </div>
              <div className="divide-y divide-zinc-800">
                {plRows.map(row => (
                  <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${row.bg}`}>
                    <span className={`text-sm ${row.bold ? 'font-bold text-zinc-50' : 'text-zinc-300'}`}>{row.label}</span>
                    <span className={`font-${row.bold ? 'bold' : 'semibold'} ${row.large ? 'text-xl' : 'text-sm'} ${row.color}`}>
                      {row.value >= 0 ? '' : '-'}{fmt(Math.abs(row.value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profit meter — owner only */}
          {isOwner && pl.revenue > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm mb-5">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Profit margin</span>
                <span className={pl.margin >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{pl.margin}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pl.margin >= 20 ? 'bg-emerald-500' : pl.margin >= 0 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, pl.margin))}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Best Sellers */}
      {bestsellers.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm mb-5">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Award size={16} className="text-amber-500" />
            <h2 className="font-semibold text-zinc-50">Best Sellers</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {bestsellers.slice(0, 8).map((p, i) => (
              <div key={p.id} className="flex items-center px-4 py-3 gap-3">
                <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-amber-500' : 'text-zinc-600'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-50 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-zinc-500">{[p.category, p.size, p.color].filter(Boolean).join(' · ')} · {p.stock_quantity} left</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-zinc-50">{p.units_sold} sold</p>
                  <p className="text-xs text-emerald-600">{`₦${Number(p.revenue).toLocaleString()}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-zinc-50 mb-3 flex items-center gap-2"><Download size={16} />Export Data</h2>
        <div className="space-y-2">
          {[['sales', 'Sales History'], ['products', 'Product List'], ['customers', 'Customer List']].map(([type, label]) => (
            <button key={type} onClick={() => download(type)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950 rounded-xl hover:bg-emerald-50 transition-colors">
              <span className="text-sm font-medium text-zinc-200">{label}</span>
              <span className="text-xs text-emerald-600 font-medium">Download CSV</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

