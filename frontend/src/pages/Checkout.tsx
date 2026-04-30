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

      // Persist to localStorage for Orders page
      const existing: LocalOrder[] = JSON.parse(localStorage.getItem('orders') || '[]');
      const newOrder: LocalOrder = {
        orderId, productId: product.id, productName: product.name,
        status: 'ASSIGNED', placedAt: new Date().toISOString(),
        deliveryLocation: coords,
      };
      localStorage.setItem('orders', JSON.stringify([newOrder, ...existing]));

      toast.success(`Order #${orderId} placed! Driver assigned.`);
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
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Checkout</h1>

      {/* Order Summary */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-sm text-slate-500 uppercase tracking-wider mb-4 font-semibold">Order Summary</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center flex-shrink-0">
            <Package size={28} className="text-indigo-300" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-100 text-lg">{product.name}</p>
            <p className="text-slate-500 text-sm line-clamp-1">{product.description}</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
          <span className="text-slate-500">Stock available</span>
          <span className="text-emerald-400 font-semibold">{product.stock} units</span>
        </div>
      </div>

      {/* Delivery Location */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-sm text-slate-500 uppercase tracking-wider mb-4 font-semibold">Delivery Location</h2>

        {geoState === 'loading' && (
          <div className="flex items-center gap-3 text-indigo-300">
            <Loader size={18} className="animate-spin" />
            <span>Acquiring GPS coordinates...</span>
          </div>
        )}
        {geoState === 'success' && coords && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-semibold text-sm">Location captured</p>
              <p className="text-slate-400 text-sm mt-0.5 font-mono">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              <p className="text-slate-600 text-xs mt-1">This will be used as your delivery geofence target.</p>
            </div>
          </div>
        )}
        {geoState === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">Location access denied</span>
            </div>
            <button onClick={captureLocation} className="btn-secondary flex items-center gap-2 text-sm w-fit">
              <MapPin size={14} /> Try Again
            </button>
          </div>
        )}
        {geoState === 'idle' && (
          <button onClick={captureLocation} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            <MapPin size={16} /> Capture my location
          </button>
        )}
      </div>

      {/* Place Order */}
      <button
        onClick={placeOrder}
        disabled={placing || geoState !== 'success'}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
      >
        {placing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing order...</>
          : <><ShoppingCart size={18} /> Confirm Order — ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
        }
      </button>
      <p className="text-center text-slate-600 text-xs mt-3">Delivery auto-completes when driver reaches your location (50m radius)</p>
    </div>
  );
}
