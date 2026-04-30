import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface Props { product: Product; }

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const outOfStock = product.stock === 0;

  return (
    <div className="glass-hover rounded-2xl overflow-hidden group flex flex-col animate-slide-up">
      {/* Product Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <Package size={36} className="text-indigo-300" />
        </div>
        {/* Stock badge */}
        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold ${outOfStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : product.stock < 5 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
          {outOfStock ? 'Out of Stock' : product.stock < 5 ? `Only ${product.stock} left` : `${product.stock} in stock`}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-100 text-lg leading-snug mb-1 group-hover:text-indigo-300 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-500 text-sm flex-1 line-clamp-2 mb-4">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <button
            onClick={() => navigate('/checkout', { state: { product } })}
            disabled={outOfStock}
            className="flex items-center gap-2 btn-primary !py-2 !px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {outOfStock ? <AlertTriangle size={14} /> : <ShoppingCart size={14} />}
            {outOfStock ? 'Unavailable' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
