import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, X, Upload } from 'lucide-react';
import { apiFetch } from '../utils/api';

const LOW_STOCK = 5;
const EMPTY_FORM = { name: '', category: '', size: '', color: '', price: '', cost: '', stock_quantity: '', image: null };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const fetchProducts = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCat) params.set('category', filterCat);
    if (filterSize) params.set('size', filterSize);
    const res = await apiFetch(`/api/products?${params}`);
    setProducts(await res.json());
  };

  const fetchFilters = async () => {
    const [catRes, sizeRes] = await Promise.all([
      apiFetch('/api/products/categories'),
      apiFetch('/api/products/sizes'),
    ]);
    setCategories(await catRes.json());
    setSizes(await sizeRes.json());
  };

  useEffect(() => { fetchProducts(); }, [search, filterCat, filterSize]);
  useEffect(() => { fetchFilters(); }, []);

  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setPreview(null); setShowForm(true); };
  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, category: p.category || '', size: p.size || '', color: p.color || '', price: p.price, cost: p.cost || '', stock_quantity: p.stock_quantity, image: null });
    setPreview(p.image_url || null);
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== 'image' && v !== '') fd.append(k, v); });
    if (form.image) fd.append('image', form.image);

    const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
    const method = editProduct ? 'PUT' : 'POST';
    await fetch(url, { method, body: fd });
    setShowForm(false);
    fetchProducts();
    fetchFilters();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const handleRestock = async () => {
    if (!restockQty || isNaN(restockQty)) return;
    await apiFetch(`/api/products/${restockProduct.id}/restock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: parseInt(restockQty) }),
    });
    setRestockProduct(null); setRestockQty('');
    fetchProducts();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{products.length} products</p>
        </div>
        <button className="btn-primary text-xs md:text-sm px-3 md:px-4" onClick={openAdd}><Plus size={14} /> Add Product</button>
      </div>

      {/* Filters */}
      <div className="card mb-4 md:mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex-1 min-w-0 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-36" value={filterSize} onChange={e => setFilterSize(e.target.value)}>
          <option value="">All Sizes</option>
          {sizes.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterCat || filterSize) && (
          <button className="btn-secondary text-xs" onClick={() => { setSearch(''); setFilterCat(''); setFilterSize(''); }}>Clear</button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />No products found
          </div>
        ) : products.map(p => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
                : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-gray-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`font-bold text-sm ${p.stock_quantity < LOW_STOCK ? 'text-red-600' : 'text-gray-900'}`}>{p.stock_quantity}</span>
                    {p.stock_quantity < LOW_STOCK && <AlertTriangle size={12} className="text-amber-500" />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.category}</span>}
                  {p.size && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.size}</span>}
                  {p.color && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.color}</span>}
                </div>
                <p className="text-sm font-bold text-violet-700 mt-1">₦{Number(p.price).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button className="flex-1 bg-violet-600 text-white text-sm font-medium py-2 rounded-xl" onClick={() => setRestockProduct(p)}>+ Restock</button>
              <button className="p-2 rounded-xl border border-gray-200 text-violet-600" onClick={() => openEdit(p)}><Edit2 size={16} /></button>
              <button className="p-2 rounded-xl border border-gray-200 text-red-400" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">Category</th>
                <th className="table-th">Size</th>
                <th className="table-th">Color</th>
                <th className="table-th">Price</th>
                <th className="table-th">Cost</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.length === 0 ? (
                <tr><td colSpan={8} className="table-td text-center text-gray-400 py-12">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />No products found
                </td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>
                      }
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="table-td"><span className="badge-gray">{p.category || '—'}</span></td>
                  <td className="table-td">{p.size || '—'}</td>
                  <td className="table-td">{p.color || '—'}</td>
                  <td className="table-td font-medium">₦{Number(p.price).toLocaleString()}</td>
                  <td className="table-td text-gray-500">₦{Number(p.cost || 0).toLocaleString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${p.stock_quantity < LOW_STOCK ? 'text-red-600' : 'text-gray-900'}`}>
                        {p.stock_quantity}
                      </span>
                      {p.stock_quantity < LOW_STOCK && (
                        <span className="badge-red flex items-center gap-1">
                          <AlertTriangle size={10} /> Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => setRestockProduct(p)}>Restock</button>
                      <button className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image upload */}
              <div>
                <label className="label">Product Image</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-violet-400 transition-colors"
                  onClick={() => fileRef.current.click()}
                >
                  {preview
                    ? <img src={preview} alt="preview" className="h-32 mx-auto rounded-lg object-contain" />
                    : <div className="py-4"><Upload size={24} className="mx-auto text-gray-400 mb-1" /><p className="text-sm text-gray-500">Click to upload image</p></div>
                  }
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <input className="input" list="cats" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                  <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="label">Size</label>
                  <input className="input" list="sizes" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
                  <datalist id="sizes">{sizes.map(s => <option key={s} value={s} />)}</datalist>
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <input className="input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Price (₦) *</label>
                  <input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Cost (₦)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Stock Qty</label>
                  <input className="input" type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Saving…' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-1">Restock</h2>
            <p className="text-sm text-gray-500 mb-4">Adding stock to <strong>{restockProduct.name}</strong> (current: {restockProduct.stock_quantity})</p>
            <label className="label">Quantity to add</label>
            <input className="input mb-4" type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setRestockProduct(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleRestock}>Add Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
