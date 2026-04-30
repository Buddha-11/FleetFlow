import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface Props { product: Product; }

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const outOfStock = product.stock === 0;

  return (
    <div className="card-hover flex flex-col animate-slide-up overflow-hidden group">
      {/* Product Image Placeholder */}
      <div className="relative h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
          <Package size={36} className="text-slate-400 dark:text-slate-500" />
        </div>
        {/* Stock badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-bold border ${outOfStock ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : product.stock < 5 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}`}>
          {outOfStock ? 'Out of Stock' : product.stock < 5 ? `Only ${product.stock} left` : `${product.stock} in stock`}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg leading-snug mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm flex-1 line-clamp-2 mb-5">{product.description}</p>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <button
            onClick={() => navigate('/checkout', { state: { product } })}
            disabled={outOfStock}
            className="flex items-center gap-2 btn-primary !py-2 !px-4 text-sm disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400"
          >
            {outOfStock ? <AlertTriangle size={14} /> : <ShoppingCart size={14} />}
            {outOfStock ? 'Unavailable' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
