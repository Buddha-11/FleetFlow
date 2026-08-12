import { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Zap, Shield, MapPin, ArrowRight, Package, CheckCircle, CreditCard, DatabaseZap, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Feature = ({ icon: Icon, title, desc }: { icon: (props: { size: number; className?: string }) => ReactElement, title: string, desc: string }) => (
  <div className="card-base p-6 flex flex-col gap-4">
    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
      <Icon size={22} className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

const Step = ({ icon: Icon, label, sub }: { icon: (props: { size: number; className?: string }) => ReactElement, label: string, sub: string }) => (
  <div className="flex flex-col items-center gap-2 text-center">
    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
      <Icon size={24} className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold">{label}</span>
    <span className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</span>
  </div>
);

export default function Landing() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        
        <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium mb-8 shadow-sm animate-fade-in">
          <Zap size={14} className="text-indigo-600 dark:text-indigo-400" />
          Kafka · Redis · gRPC · Kubernetes
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 animate-slide-up leading-tight tracking-tight max-w-4xl">
          Production-Grade Delivery with
          <br className="hidden sm:block" />
          <span className="text-indigo-600 dark:text-indigo-400"> Real-Time Automation</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 animate-slide-up leading-relaxed">
          An event-driven microservices platform featuring async payment processing, Saga-pattern distributed transactions, Redis caching, and live WebSocket delivery alerts.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
          {isAuthenticated ? (
            <>
              <Link to="/products" className="btn-primary flex items-center justify-center gap-2 text-base shadow-sm">
                <Package size={18} /> Browse Products <ArrowRight size={16} />
              </Link>
              {isAdmin && (
                <Link to="/admin" className="btn-secondary flex items-center justify-center gap-2 text-base">
                  Admin Dashboard
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base shadow-sm">
                Create Account <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center justify-center gap-2 text-base">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Saga Flow diagram */}
        <div className="mt-20 w-full max-w-4xl">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Saga Event Flow (Kafka)</p>
          <div className="card-base px-6 py-8 flex flex-wrap sm:flex-nowrap items-start justify-center sm:justify-between gap-4 animate-fade-in">
            <Step icon={Package} label="Order Placed" sub="PENDING" />
            <div className="hidden sm:flex flex-col items-center gap-1 flex-1 pt-5">
              <div className="h-px w-full bg-indigo-200 dark:bg-indigo-800" />
              <span className="text-[9px] text-indigo-400 font-mono">OrderCreated →</span>
            </div>
            <Step icon={CreditCard} label="Payment Service" sub="PaymentProcessed" />
            <div className="hidden sm:flex flex-col items-center gap-1 flex-1 pt-5">
              <div className="h-px w-full bg-indigo-200 dark:bg-indigo-800" />
              <span className="text-[9px] text-indigo-400 font-mono">OrderPaid →</span>
            </div>
            <Step icon={DatabaseZap} label="Stock Deducted" sub="StockDeducted" />
            <div className="hidden sm:flex flex-col items-center gap-1 flex-1 pt-5">
              <div className="h-px w-full bg-indigo-200 dark:bg-indigo-800" />
              <span className="text-[9px] text-indigo-400 font-mono">GPS Geofence →</span>
            </div>
            <Step icon={CheckCircle} label="Auto Delivered" sub="WebSocket Push" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Production-Ready Architecture</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">Every layer is engineered for scale, resilience, and observability.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Feature icon={Zap} title="Kafka Saga Pattern" desc="Distributed transactions orchestrated via Kafka events. If stock fails post-payment, a compensating RefundPayment event rolls back the transaction automatically." />
            <Feature icon={Shield} title="Rate Limiting & Circuit Breakers" desc="Redis-backed sliding window rate limiter protects the API Gateway. Opossum circuit breakers prevent cascading failures in gRPC calls." />
            <Feature icon={Radio} title="Real-Time WebSockets" desc="Socket.io with Redis Pub/Sub adapter pushes live delivery alerts to the correct client pod, regardless of which Gateway instance they are connected to." />
            <Feature icon={DatabaseZap} title="Redis Caching" desc="Product catalog reads are served from Redis with Cache-Aside strategy. Cache is automatically invalidated when stock changes via Kafka events." />
            <Feature icon={MapPin} title="Haversine Geofencing" desc="Automated order fulfillment triggered by native spherical geometry calculations when driver enters a 200m radius of the delivery target." />
            <Feature icon={Truck} title="Zero-Trust Kubernetes" desc="Only the API Gateway is exposed externally. All internal services are isolated via ClusterIP, secured by JWT RBAC enforced at the gateway layer." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-center text-slate-500 text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-300">FleetFlow</span> — Production-Grade Delivery & E-Commerce Microservices
      </footer>
    </div>
  );
}
