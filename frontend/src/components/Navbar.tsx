import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, LayoutDashboard, Package, LogOut, LogIn, UserPlus, ShoppingCart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (p: string) => location.pathname === p;
  const link = (p: string) => `transition-colors duration-200 text-sm font-medium px-3 py-2 rounded-lg ${isActive(p) ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10 shadow-xl shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              SwiftCart
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && <Link to="/products" className={link('/products')}><span className="flex items-center gap-1.5"><Package size={14} />Products</span></Link>}
            {isAuthenticated && <Link to="/orders" className={link('/orders')}><span className="flex items-center gap-1.5"><ShoppingCart size={14} />My Orders</span></Link>}
            {isAdmin && <Link to="/admin" className={link('/admin')}><span className="flex items-center gap-1.5"><LayoutDashboard size={14} />Admin</span></Link>}
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-xs text-slate-500 mr-1">
                  <span className="text-slate-300 font-medium">{user?.email}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-violet-500/20 text-violet-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                    {user?.role}
                  </span>
                </span>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors">
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"><LogIn size={14} />Login</Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5"><UserPlus size={14} />Register</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-slate-400 hover:text-white">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden glass border-t border-white/10 px-4 pb-4 pt-2 flex flex-col gap-1 animate-fade-in">
          {isAuthenticated && <Link to="/products" onClick={() => setOpen(false)} className={link('/products')}>Products</Link>}
          {isAuthenticated && <Link to="/orders" onClick={() => setOpen(false)} className={link('/orders')}>My Orders</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className={link('/admin')}>Admin Dashboard</Link>}
          {isAuthenticated
            ? <button onClick={handleLogout} className="text-left text-sm text-red-400 px-3 py-2">Logout</button>
            : <>
                <Link to="/login" onClick={() => setOpen(false)} className={link('/login')}>Login</Link>
                <Link to="/register" onClick={() => setOpen(false)} className={link('/register')}>Register</Link>
              </>
          }
        </div>
      )}
    </nav>
  );
}
