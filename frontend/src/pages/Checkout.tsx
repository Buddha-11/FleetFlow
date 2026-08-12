import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, ShoppingCart, CheckCircle, AlertCircle, Loader, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { Product, LocalOrder } from '../types';

type GeoState = 'idle' | 'loading' | 'success' | 'error';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const product: Product | undefined = (location.state as { product: Product })?.product;

  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placing, setPlacing] = useState(false);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('success');
        toast.success('Location captured!');
      },
      () => { setGeoState('error'); toast.error('Could not get location. Check browser permissions.'); }
    );
  }, []);

  useEffect(() => {
    if (!product) { navigate('/products'); return; }
    captureLocation();
  }, [product, navigate, captureLocation]);

  if (!product) return null;
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

  const placeOrder = async () => {
    if (!coords) { toast.error('Location required to place order'); return; }
    setPlacing(true);
    try {
      const res = await client.post('/order', {
        productId: product.id,
        deliveryLocation: { lat: coords.lat, lng: coords.lng },
      });
      const { orderId } = res.data;

      const existing: LocalOrder[] = JSON.parse(localStorage.getItem('orders') || '[]');
      const newOrder: LocalOrder = {
        orderId, productId: product.id, productName: product.name,
        status: 'PENDING', placedAt: new Date().toISOString(),
        deliveryLocation: coords,
      };
      localStorage.setItem('orders', JSON.stringify([newOrder, ...existing]));

      toast.success(`Order #${orderId} is processing! Payment service notified via Kafka.`);
      navigate('/orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Order failed';
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Checkout</h1>

      {/* Order Summary */}
      <div className="card-base p-6 mb-6">
        <h2 className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 font-semibold">Order Summary</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
            <Package size={28} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{product.name}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-1">{product.description}</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-4 sm:mt-0">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Inventory Status</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{product.stock} units available</span>
        </div>
      </div>

      {/* Delivery Location */}
      <div className="card-base p-6 mb-6">
        <h2 className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 font-semibold">Delivery Geofence Target</h2>

        {geoState === 'loading' && (
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <Loader size={18} className="animate-spin" />
            <span className="text-sm font-medium">Acquiring GPS coordinates...</span>
          </div>
        )}
        {geoState === 'success' && coords && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">Location Acquired</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block border border-slate-200 dark:border-slate-700">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Delivery completion will automatically trigger when driver enters a 50m radius of this point.</p>
            </div>
          </div>
        )}
        {geoState === 'error' && (
          <div className="flex flex-col gap-3 bg-red-50 dark:bg-red-500/10 p-4 rounded-lg border border-red-100 dark:border-red-500/20">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Location access denied</span>
            </div>
            <button onClick={captureLocation} className="btn-secondary bg-white text-sm w-fit">
              <MapPin size={14} className="inline mr-2" /> Try Again
            </button>
          </div>
        )}
        {geoState === 'idle' && (
          <button onClick={captureLocation} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors">
            <MapPin size={16} /> Request Location Access
          </button>
        )}
      </div>

      {/* Place Order */}
      <button
        onClick={placeOrder}
        disabled={placing || geoState !== 'success'}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4 shadow-sm"
      >
        {placing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Transaction...</>
          : <><ShoppingCart size={18} /> Confirm Order — ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
        }
      </button>
    </div>
  );
}
