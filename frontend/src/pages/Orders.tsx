import { useState, useEffect, ReactElement } from 'react';
import { RefreshCw, Package, MapPin, Truck, CheckCircle, Clock, CreditCard, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { LocalOrder, OrderStatusResponse } from '../types';

const STATUS_STYLES: Record<string, { icon: (props: { size: number }) => ReactElement, color: string, label: string }> = {
  PENDING:        { icon: Clock,         color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',              label: 'Pending Payment' },
  PAID:           { icon: CreditCard,    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',               label: 'Payment Confirmed' },
  PLACED:         { icon: Clock,         color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',              label: 'Placed' },
  ASSIGNED:       { icon: Package,       color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',  label: 'Driver Assigned' },
  IN_TRANSIT:     { icon: Truck,         color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',         label: 'In Transit' },
  DELIVERED:      { icon: CheckCircle,   color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', label: 'Delivered' },
  CANCELLED:      { icon: XCircle,       color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',                    label: 'Cancelled' },
  CANCELLED_STOCK:{ icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',  label: 'Cancelled (Stock)' },
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
          orders[i].status = d.status;
        }
      });
      localStorage.setItem('orders', JSON.stringify(orders));
      setStatuses(map);
      setOrders([...orders]);
      toast.success('Statuses synced with server');
    } catch { toast.error('Failed to sync statuses'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (orders.length > 0) refreshStatuses();
  }, [orders.length]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Order History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={refreshStatuses} disabled={refreshing} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Sync Status
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="card-base p-20 text-center flex flex-col items-center justify-center">
          <Package size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">No order history</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Orders placed will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map(order => {
            const live = statuses[order.orderId];
            const status = live?.status || order.status || 'PENDING';
            const info = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
            const Icon = info.icon;

            const isCancelled = status === 'CANCELLED' || status === 'CANCELLED_STOCK';

            return (
              <div key={order.orderId} className="card-base p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${isCancelled ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <Package size={22} className={isCancelled ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{order.productName}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">ID: #{order.orderId} &middot; {new Date(order.placedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`status-badge ${info.color}`}>
                    <Icon size={12} /> {info.label}
                  </span>
                </div>

                {/* Saga Status Explanation */}
                {(status === 'PENDING' || status === 'PAID') && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {status === 'PENDING' ? 'Payment Service is processing this order via Kafka...' : 'Product Service is confirming stock availability...'}
                  </div>
                )}

                {/* Driver location */}
                {live?.driverLocation && (
                  <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-sm bg-slate-50/50 dark:bg-slate-900/50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold"><Truck size={12} /> Driver Coords</p>
                      <p className="text-slate-700 dark:text-slate-300 font-mono text-xs bg-white dark:bg-slate-950 px-2 py-1 rounded inline-block border border-slate-200 dark:border-slate-800">{live.driverLocation.lat.toFixed(5)}, {live.driverLocation.lng.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold"><MapPin size={12} /> Target Geofence</p>
                      <p className="text-slate-700 dark:text-slate-300 font-mono text-xs bg-white dark:bg-slate-950 px-2 py-1 rounded inline-block border border-slate-200 dark:border-slate-800">{order.deliveryLocation.lat.toFixed(5)}, {order.deliveryLocation.lng.toFixed(5)}</p>
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
