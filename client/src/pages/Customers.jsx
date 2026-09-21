import { useState, useEffect } from 'react';
import { Users, Plus, Phone, ShoppingBag, X, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { apiFetch } from '../utils/api';

const EMPTY = { name: '', phone: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const load = async () => {
    const res = await apiFetch('/api/customers');
    setCustomers(await res.json());
  };

  const loadDetail = async (id) => {
    const res = await apiFetch(`/api/customers/${id}`);
    setSelected(await res.json());
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditing(null);
    load();
    if (selected) loadDetail(selected.id);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  };

  if (selected) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="text-sm text-violet-600 mb-4 flex items-center gap-1">
          &larr; Back to customers
        </button>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
              {selected.phone && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone size={13} />{selected.phone}</p>}
              {selected.notes && <p className="text-sm text-gray-400 mt-1">{selected.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)} className="p-2 rounded-xl border border-gray-200 text-violet-600"><Edit2 size={15} /></button>
              <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-xl border border-gray-200 text-red-400"><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-xs text-violet-500">Total Purchases</p>
              <p className="text-xl font-bold text-violet-900">{selected.purchases?.length || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-500">Total Spent</p>
              <p className="text-xl font-bold text-emerald-900">{fmt(selected.purchases?.reduce((s, p) => s + p.sale_price * p.quantity, 0))}</p>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Purchase History</h3>
        {!selected.purchases?.length ? (
          <p className="text-gray-400 text-sm text-center py-8">No purchases yet</p>
        ) : (
          <div className="space-y-2">
            {selected.purchases.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.product_name}</p>
                  <p className="text-xs text-gray-400">x{p.quantity} · {p.payment_method} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{fmt(p.sale_price * p.quantity)}</p>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
              <h3 className="font-bold text-lg mb-4">Edit Customer</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className="input" placeholder="Full name *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input" placeholder="Phone number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <textarea className="input" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} total</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm px-4"><Plus size={15} /> Add</button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <Users size={48} className="mx-auto mb-3" />
          <p className="text-sm">No customers yet</p>
          <button onClick={openAdd} className="mt-3 text-violet-600 text-sm font-medium">Add your first customer</button>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <button key={c.id} onClick={() => loadDetail(c.id)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm hover:border-violet-200 transition-colors">
              <div className="text-left">
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400">
                  {c.phone ? `${c.phone} · ` : ''}{c.total_purchases} purchases · {fmt(c.total_spent)} spent
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">New Customer</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="input" placeholder="Full name *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              <input className="input" placeholder="Phone number (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <textarea className="input" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Saving…' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
