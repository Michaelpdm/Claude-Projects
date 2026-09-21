import { useState, useEffect } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

const EMPTY_FORM = { customer_name: '', amount: '', date_due: '', notes: '' };

export default function Debits() {
  const [debits, setDebits] = useState([]);
  const [summary, setSummary] = useState({ totalOutstanding: 0, count: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const today = new Date().toISOString().slice(0, 10);

  const reload = async () => {
    const [debRes, sumRes] = await Promise.all([
      apiFetch('/api/debits'),
      apiFetch('/api/debits/summary'),
    ]);
    setDebits(await debRes.json());
    setSummary(await sumRes.json());
  };

  useEffect(() => { reload(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await apiFetch('/api/debits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    reload();
    setLoading(false);
  };

  const handleClear = async (id) => {
    if (!confirm('Mark this debit as cleared?')) return;
    await apiFetch(`/api/debits/${id}/clear`, { method: 'POST' });
    reload();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    await apiFetch(`/api/debits/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Debits (BNPL)</h1>
          <p className="text-sm text-gray-500">Buy Now Pay Later tracking</p>
        </div>
        <button className="btn-primary text-xs md:text-sm px-3 md:px-4" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Debit
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 rounded-xl p-3">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-3xl font-bold text-red-600">{fmt(summary.totalOutstanding)}</p>
            <p className="text-xs text-gray-400">{summary.count || 0} pending debits</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Customer</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {debits.length === 0 ? (
                <tr><td colSpan={5} className="table-td text-center text-gray-400 py-10">No debits recorded</td></tr>
              ) : debits.map(d => {
                const isOverdue = d.status === 'Pending' && d.date_due && d.date_due < today;
                return (
                  <tr key={d.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="table-td">
                      <p className="font-medium text-gray-900">{d.customer_name}</p>
                      {d.notes && <p className="text-xs text-gray-400">{d.notes}</p>}
                    </td>
                    <td className="table-td font-semibold text-red-600">{fmt(d.amount)}</td>
                    <td className="table-td">
                      {d.date_due
                        ? <span className={isOverdue ? 'text-red-600 font-medium' : ''}>{d.date_due}{isOverdue && ' (Overdue)'}</span>
                        : <span className="text-gray-400">--</span>
                      }
                    </td>
                    <td className="table-td">
                      <span className={d.status === 'Cleared' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-amber'}>
                        {d.status}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        {d.status === 'Pending' && (
                          <button className="btn-success text-xs py-1 px-2" onClick={() => handleClear(d.id)}>Clear</button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" onClick={() => handleDelete(d.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">New Debit Record</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Customer Name *</label>
                <input className="input" required value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount Owed (₦) *</label>
                <input className="input" type="number" min="0" step="0.01" required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input className="input" type="date" value={form.date_due}
                  onChange={e => setForm(f => ({ ...f, date_due: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-danger flex-1" disabled={loading}>
                  {loading ? 'Saving...' : 'Add Debit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
