import { useState, useEffect, FormEvent } from 'react';
import { Plus, Package, Layers, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { Product } from '../types';

const initialForm = { name: '', price: '', description: '', stock: '' };

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await client.get<Product[]>('/products');
      setProducts(res.data);
    } catch { toast.error('Failed to load inventory'); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const outOfStock = products.filter(p => p.stock === 0).length;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/admin/product', {
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
        stock: parseInt(form.stock),
      });
      toast.success('Product added successfully!');
      setForm(initialForm);
      setShowForm(false);
      fetchProducts();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage inventory and monitor stock levels</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Products', value: products.length, icon: Package, color: 'from-indigo-500 to-violet-500' },
          { label: 'Total Stock Units', value: totalStock, icon: Layers, color: 'from-emerald-500 to-teal-500' },
          { label: 'Out of Stock', value: outOfStock, icon: X, color: outOfStock > 0 ? 'from-red-500 to-rose-500' : 'from-slate-600 to-slate-500' },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-2xl p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
              <stat.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-8 animate-slide-up">
          <h2 className="text-lg font-semibold text-slate-100 mb-5 flex items-center gap-2"><Plus size={18} className="text-indigo-400" /> New Product</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Product name" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input required type="number" step="0.01" placeholder="Price (₹)" className="input-field" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <input required type="number" min="0" placeholder="Stock quantity" className="input-field" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            <input placeholder="Description" className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {loading ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-slate-200">Inventory</h2>
        </div>
        {products.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No products yet. Add your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map(p => {
                  const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-100">{p.name}</p>
                          <p className="text-slate-500 text-xs line-clamp-1">{p.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">₹{price.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono">{p.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`status-badge border ${p.stock === 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : p.stock < 5 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                          {p.stock === 0 ? 'Out of Stock' : p.stock < 5 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
