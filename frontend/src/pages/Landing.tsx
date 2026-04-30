import { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, Shield, MapPin, ArrowRight, Package, Truck, CheckCircle } from 'lucide-react';
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

const Step = ({ icon: Icon, label }: { icon: (props: { size: number; className?: string }) => ReactElement, label: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
      <Icon size={24} className="text-slate-700 dark:text-slate-300" />
    </div>
    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium text-center">{label}</span>
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
          Enterprise-Grade Kubernetes Architecture
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 animate-slide-up leading-tight tracking-tight max-w-4xl">
          Intelligent E-Commerce with
          <br className="hidden sm:block" />
          <span className="text-indigo-600 dark:text-indigo-400"> Automated Delivery</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 animate-slide-up leading-relaxed">
          A robust microservices platform featuring real-time geofenced tracking, distributed state management, and strict role-based access control.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
          {isAuthenticated ? (
            <>
              <Link to="/products" className="btn-primary flex items-center justify-center gap-2 text-base shadow-sm">
                <ShoppingBag size={18} /> Browse Products <ArrowRight size={16} />
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

        {/* Flow diagram */}
        <div className="mt-20 w-full max-w-3xl">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">System Workflow</p>
          <div className="card-base px-8 py-8 flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-4 animate-fade-in">
            <Step icon={ShoppingBag} label="Order Placed" />
            <div className="hidden sm:block h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <Step icon={MapPin} label="Geofence Set" />
            <div className="hidden sm:block h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <Step icon={Truck} label="Driver Tracked" />
            <div className="hidden sm:block h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <Step icon={CheckCircle} label="Auto Delivered" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Core Infrastructure</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">Designed for scale, reliability, and precision tracking.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Feature icon={Zap} title="gRPC Inter-Service" desc="Internal communication utilizes Protocol Buffers for low-latency, strictly-typed data exchange between isolated microservices." />
            <Feature icon={Shield} title="Zero-Trust Architecture" desc="Only the API Gateway is exposed externally. Internal services are inaccessible from the public internet, secured by JWT RBAC." />
            <Feature icon={MapPin} title="Haversine Formula" desc="Automated order fulfillment triggered by native spherical geometry calculations when drivers enter a 50m radius." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-center text-slate-500 text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-300">SwiftCart</span> — Enterprise Microservices Architecture
      </footer>
    </div>
  );
}
