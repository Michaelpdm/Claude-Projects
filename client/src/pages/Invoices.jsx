import { useState, useEffect } from 'react';
import { FileText, Plus, X, Printer, Eye } from 'lucide-react';
import { apiFetch } from '../utils/api';

const STATUSES = ['Draft', 'Sent', 'Paid'];
const EMPTY_LINE = { description: '', quantity: 1, unit_price: '', subtotal: 0 };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [form, setForm] = useState({ customer_name: '', items: [{ ...EMPTY_LINE }] });
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const reload = async () => {
    const [invRes, prodRes] = await Promise.all([
      apiFetch('/api/invoices'),
      apiFetch('/api/products'),
    ]);
    setInvoices(await invRes.json());
    setProducts(await prodRes.json());
  };

  useEffect(() => { reload(); }, []);

  const updateLine = (i, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(field === 'quantity' ? value : items[i].quantity) || 0;
        const price = parseFloat(field === 'unit_price' ? value : items[i].unit_price) || 0;
        items[i].subtotal = qty * price;
      }
      return { ...f, items };
    });
  };

  const autoFill = (i, product) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { description: product.name, quantity: 1, unit_price: product.price, subtotal: product.price };
      return { ...f, items };
    });
  };

  const addLine = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_LINE }] }));
  const removeLine = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const total = form.items.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    await apiFetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: form.customer_name, items: form.items, total }),
    });
    setForm({ customer_name: '', items: [{ ...EMPTY_LINE }] });
    setShowForm(false);
    reload();
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await apiFetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    reload();
    if (viewInvoice?.id === id) setViewInvoice(v => ({ ...v, status }));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
    setViewInvoice(null);
    reload();
  };

  const statusColor = (s) => s === 'Paid' ? 'badge-green' : s === 'Sent' ? 'badge-blue' : 'badge-gray';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">{invoices.length} invoices</p>
        </div>
        <button className="btn-primary text-xs md:text-sm px-3 md:px-4" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice list */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.length === 0 ? (
                  <tr><td colSpan={4} className="table-td text-center text-gray-400 py-10">
                    <FileText size={28} className="mx-auto mb-2 opacity-30" />No invoices yet
                  </td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewInvoice(inv)}>
                    <td className="table-td">
                      <p className="font-medium text-gray-900">{inv.customer_name}</p>
                      <p className="text-xs text-gray-400">{inv.created_at?.slice(0, 10)}</p>
                    </td>
                    <td className="table-td font-semibold">{fmt(inv.total)}</td>
                    <td className="table-td"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                    <td className="table-td">
                      <button className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600" onClick={e => { e.stopPropagation(); setViewInvoice(inv); }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice view / print */}
        {viewInvoice ? (
          <div className="card">
            <div className="flex items-center justify-between mb-4 no-print">
              <h2 className="font-semibold text-gray-900">Invoice #{viewInvoice.id}</h2>
              <div className="flex items-center gap-2">
                <select className="input w-28 text-xs"
                  value={viewInvoice.status}
                  onChange={e => updateStatus(viewInvoice.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-secondary py-1.5 px-2.5 text-xs" onClick={() => window.print()}>
                  <Printer size={14} /> Print
                </button>
                <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 no-print" onClick={() => handleDelete(viewInvoice.id)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Printable area */}
            <div className="print-only text-center mb-6">
              <h1 className="text-2xl font-bold">INVOICE</h1>
            </div>
            <div className="border-b border-gray-100 pb-4 mb-4">
              <p className="text-sm text-gray-500">Bill To</p>
              <p className="font-semibold text-gray-900">{viewInvoice.customer_name}</p>
              <p className="text-xs text-gray-400">{viewInvoice.created_at?.slice(0, 10)}</p>
            </div>
            <table className="w-full mb-4 text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs text-gray-500 font-semibold">Item</th>
                  <th className="py-2 text-right text-xs text-gray-500 font-semibold">Qty</th>
                  <th className="py-2 text-right text-xs text-gray-500 font-semibold">Price</th>
                  <th className="py-2 text-right text-xs text-gray-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {(typeof viewInvoice.items === 'string' ? JSON.parse(viewInvoice.items) : viewInvoice.items).map((it, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{fmt(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-700">Total</span>
              <p className="text-2xl font-bold">{fmt(viewInvoice.total)}</p>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-gray-400 min-h-48">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click an invoice to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">New Invoice</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="label">Customer Name *</label>
                <input className="input" required value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>

              {/* Line items */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Items</label>
                </div>
                <div className="space-y-3">
                  {form.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        {i === 0 && <p className="text-xs text-gray-400 mb-1">Description</p>}
                        <input className="input text-sm" placeholder="Item name" value={it.description}
                          list={`products-${i}`}
                          onChange={e => {
                            updateLine(i, 'description', e.target.value);
                            const match = products.find(p => p.name === e.target.value);
                            if (match) autoFill(i, match);
                          }} />
                        <datalist id={`products-${i}`}>{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <p className="text-xs text-gray-400 mb-1">Qty</p>}
                        <input className="input text-sm" type="number" min="1" value={it.quantity}
                          onChange={e => updateLine(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        {i === 0 && <p className="text-xs text-gray-400 mb-1">Unit Price (₦)</p>}
                        <input className="input text-sm" type="number" min="0" value={it.unit_price}
                          onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        {i === 0 && <p className="text-xs text-gray-400 mb-1">&nbsp;</p>}
                        <p className="text-sm font-medium py-2">{fmt(it.subtotal || 0)}</p>
                      </div>
                      <div className="col-span-1">
                        {i === 0 && <p className="text-xs mb-1">&nbsp;</p>}
                        {form.items.length > 1 && (
                          <button type="button" className="p-1.5 text-red-400 hover:text-red-600" onClick={() => removeLine(i)}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn-secondary text-xs mt-3" onClick={addLine}>
                  <Plus size={12} /> Add Line
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100 mb-4">
                <span>Total</span>
                <span className="text-xl font-bold text-violet-600">{fmt(total)}</span>
              </div>

              <form onSubmit={handleCreate}>
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading || !form.customer_name}>
                    {loading ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
