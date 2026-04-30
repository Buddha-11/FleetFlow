import { useState, useEffect, ReactElement } from 'react';
import { RefreshCw, Package, MapPin, Truck, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { LocalOrder, OrderStatusResponse } from '../types';

const STATUS_STYLES: Record<string, { icon: (props: { size: number }) => ReactElement, color: string, label: string }> = {
  PLACED:     { icon: Clock,         color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',    label: 'Placed' },
  ASSIGNED:   { icon: Package,       color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', label: 'Driver Assigned' },
  IN_TRANSIT: { icon: Truck,         color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',    label: 'In Transit' },
  DELIVERED:  { icon: CheckCircle,   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Delivered' },
};

export default function Orders() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [statuses, setStatuses] = useState<Record<number, OrderStatusResponse>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const stored: LocalOrder[] = JSON.parse(localStorage.getItem('orders') || '[]');
    setOrders(stored);
  }, []);

  const refreshStatuses = async () => {
    if (orders.length === 0) return;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        orders.map(o => client.get<OrderStatusResponse>(`/order/${o.orderId}/status`))
      );
      const map: Record<number, OrderStatusResponse> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const d = r.value.data;
          map[d.orderId] = d;
          // Update localStorage status
          orders[i].status = d.status;
        }
      });
      localStorage.setItem('orders', JSON.stringify(orders));
      setStatuses(map);
      setOrders([...orders]);
      toast.success('Statuses refreshed');
    } catch { toast.error('Failed to refresh'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (orders.length > 0) refreshStatuses();
  }, [orders.length]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">My Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={refreshStatuses} disabled={refreshing} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="glass rounded-2xl p-20 text-center">
          <Package size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">No orders yet. Browse products and place your first order!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map(order => {
            const live = statuses[order.orderId];
            const status = live?.status || order.status || 'PLACED';
            const info = STATUS_STYLES[status] || STATUS_STYLES.PLACED;
            const Icon = info.icon;

            return (
              <div key={order.orderId} className="glass-hover rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Package size={22} className="text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{order.productName}</p>
                      <p className="text-slate-500 text-xs">Order #{order.orderId} · {new Date(order.placedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`status-badge border ${info.color}`}>
                    <Icon size={12} /> {info.label}
                  </span>
                </div>

                {/* Driver location */}
                {live?.driverLocation && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Truck size={11} /> Driver Location</p>
                      <p className="text-slate-300 font-mono text-xs">{live.driverLocation.lat.toFixed(5)}, {live.driverLocation.lng.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><MapPin size={11} /> Delivery Target</p>
                      <p className="text-slate-300 font-mono text-xs">{order.deliveryLocation.lat.toFixed(5)}, {order.deliveryLocation.lng.toFixed(5)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
