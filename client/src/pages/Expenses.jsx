import { useState, useEffect } from 'react';
import { Plus, Trash2, X, TrendingDown } from 'lucide-react';

const CATEGORIES = ['Stock Purchase', 'Rent', 'Transport', 'Salary', 'Utilities', 'Marketing', 'General'];
const EMPTY = { description: '', amount: '', category: 'General', expense_date: new Date().toISOString().split('T')[0], notes: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ today: 0, thisWeek: 0, thisMonth: { total: 0, count: 0 }, byCategory: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const load = async () => {
    const [expRes, sumRes] = await Promise.all([
      fetch('/api/expenses').then(r => r.json()),
      fetch('/api/expenses/summary').then(r => r.json()),
    ]);
    setExpenses(expRes);
    setSummary(sumRes);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setShowForm(false);
    setForm(EMPTY);
    load();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    load();
  };

  const catColor = (cat) => {
    const map = { 'Stock Purchase': 'bg-blue-50 text-blue-700', 'Rent': 'bg-red-50 text-red-700', 'Transport': 'bg-amber-50 text-amber-700', 'Salary': 'bg-purple-50 text-purple-700', 'Utilities': 'bg-orange-50 text-orange-700', 'Marketing': 'bg-pink-50 text-pink-700', 'General': 'bg-gray-100 text-gray-600' };
    return map[cat] || map['General'];
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">This month: {fmt(summary.thisMonth?.total)}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4"><Plus size={15} /> Add</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-red-50 rounded-2xl p-3">
          <p className="text-xs text-red-500 mb-0.5">This Month</p>
          <p className="text-lg font-bold text-red-900">{fmt(summary.thisMonth?.total)}</p>
          <p className="text-xs text-red-400">{summary.thisMonth?.count || 0} entries</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-3">
          <p className="text-xs text-orange-500 mb-0.5">This Week</p>
          <p className="text-lg font-bold text-orange-900">{fmt(summary.thisWeek)}</p>
        </div>
      </div>

      {/* By category */}
      {summary.byCategory?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-3">BY CATEGORY (this month)</p>
          <div className="space-y-2">
            {summary.byCategory.map(c => (
              <div key={c.category} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor(c.category)}`}>{c.category}</span>
                <span className="font-semibold text-sm text-gray-900">{fmt(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <TrendingDown size={48} className="mx-auto mb-3" />
          <p className="text-sm">No expenses logged yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{e.description}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${catColor(e.category)}`}>{e.category}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(e.expense_date).toLocaleDateString()}{e.notes ? ` · ${e.notes}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <p className="font-bold text-red-600 text-sm">{fmt(e.amount)}</p>
                <button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Log Expense</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="input" placeholder="Description *" required value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} autoFocus />
              <input className="input" type="number" min="0" step="0.01" placeholder="Amount (₦) *" required
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input className="input" type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              <input className="input" placeholder="Notes (optional)" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Saving…' : 'Log Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
