import { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, Shield, MapPin, ArrowRight, Package, Truck, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Feature = ({ icon: Icon, title, desc, gradient }: { icon: (props: { size: number; className?: string }) => ReactElement, title: string, desc: string, gradient: string }) => (
  <div className="glass-hover rounded-2xl p-6 flex flex-col gap-3">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
      <Icon size={22} className="text-white" />
    </div>
    <h3 className="font-semibold text-slate-100 text-lg">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const Step = ({ icon: Icon, label, color }: { icon: (props: { size: number }) => ReactElement, label: string, color: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center`}><Icon size={26} /></div>
    <span className="text-xs text-slate-400 text-center font-medium">{label}</span>
  </div>
);

export default function Landing() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 glass border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs text-indigo-300 font-medium mb-8 animate-fade-in">
          <Zap size={12} className="text-yellow-400" />
          Powered by Kubernetes & Microservices
        </div>

        <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 animate-slide-up leading-tight">
          Shop Smarter,
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Deliver Faster
          </span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 animate-slide-up leading-relaxed">
          A cloud-native e-commerce platform with real-time GPS driver tracking, automated geofenced delivery, and role-based access control—all built on Kubernetes microservices.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
          {isAuthenticated ? (
            <>
              <Link to="/products" className="btn-primary flex items-center justify-center gap-2 text-base">
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
              <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base">
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center justify-center gap-2 text-base">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Flow diagram */}
        <div className="mt-20 glass rounded-2xl px-8 py-6 flex items-center gap-4 animate-fade-in">
          <Step icon={ShoppingBag} label="Browse" color="bg-indigo-500/20 text-indigo-300" />
          <div className="h-px w-8 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <Step icon={MapPin} label="Geolocation" color="bg-violet-500/20 text-violet-300" />
          <div className="h-px w-8 bg-gradient-to-r from-violet-500 to-purple-500" />
          <Step icon={Truck} label="Assigned Driver" color="bg-purple-500/20 text-purple-300" />
          <div className="h-px w-8 bg-gradient-to-r from-purple-500 to-emerald-500" />
          <Step icon={CheckCircle} label="Auto Delivered" color="bg-emerald-500/20 text-emerald-300" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16 w-full">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-3">Built with Production-Grade Architecture</h2>
        <p className="text-slate-500 text-center mb-12">Every component is a microservice, isolated and independently scalable.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature icon={Zap} title="gRPC Inter-Service" desc="Order service validates users and products over Protocol Buffers—10x faster than REST for internal calls." gradient="from-yellow-500 to-orange-500" />
          <Feature icon={Shield} title="JWT Role-Based Auth" desc="Stateless authentication with Admin and User roles enforced at the API Gateway. No session storage needed." gradient="from-indigo-500 to-violet-500" />
          <Feature icon={MapPin} title="Haversine Geofencing" desc="Orders auto-complete when the driver enters a 50m radius of your location—calculated natively using spherical geometry." gradient="from-emerald-500 to-teal-500" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-slate-600 text-sm">
        <span className="text-slate-500">SwiftCart</span> — Cloud-Native E-Commerce Microservices · Docker + Kubernetes
      </footer>
    </div>
  );
}
