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
    } catch { toast.error('Failed to fetch inventory'); }
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
      toast.success('Product catalog updated');
      setForm(initialForm);
      setShowForm(false);
      fetchProducts();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Inventory management and metrics overview</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Discard Draft' : 'New Entry'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Active SKUs', value: products.length, icon: Package, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' },
          { label: 'Total Units', value: totalStock, icon: Layers, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
          { label: 'Depleted Stock', value: outOfStock, icon: X, color: outOfStock > 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
        ].map(stat => (
          <div key={stat.label} className="card-base p-6 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${stat.color}`}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1.5">{stat.value}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="card-base p-8 mb-8 animate-slide-up">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus size={18} className="text-indigo-600 dark:text-indigo-400" /> Create Inventory Item
            </h2>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
              <input required className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Base Price (₹)</label>
              <input required type="number" step="0.01" className="input-field" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Description</label>
              <input className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Initial Stock Units</label>
              <input required type="number" min="0" className="input-field" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            
            <div className="md:col-span-2 flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {loading ? 'Processing...' : 'Commit to Database'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="card-base overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Active Inventory Log</h2>
        </div>
        {products.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-500 dark:text-slate-400">Database is empty. Initialize catalog by adding new products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <th className="px-6 py-4 font-semibold">SKU Details</th>
                  <th className="px-6 py-4 font-semibold text-right">Price</th>
                  <th className="px-6 py-4 font-semibold text-center">Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">System Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {products.map(p => {
                  const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-1 max-w-md">{p.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 text-right">
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`status-badge ${p.stock === 0 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : p.stock < 5 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}`}>
                          {p.stock === 0 ? 'Out of Stock' : p.stock < 5 ? 'Low Stock' : 'Optimal'}
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
