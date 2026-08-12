import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, LayoutDashboard, Package, LogOut, LogIn, UserPlus, ShoppingCart, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (p: string) => location.pathname === p;
  const link = (p: string) => `transition-colors duration-200 text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 ${isActive(p) ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`;

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Truck size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              FleetFlow
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && <Link to="/products" className={link('/products')}><Package size={14} />Products</Link>}
            {isAuthenticated && <Link to="/orders" className={link('/orders')}><ShoppingCart size={14} />My Orders</Link>}
            {isAdmin && <Link to="/admin" className={link('/admin')}><LayoutDashboard size={14} />Admin</Link>}
          </div>

          {/* Auth Actions & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            {isAuthenticated ? (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {user?.role}
                  </span>
                </span>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors">
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><LogIn size={14} />Login</Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5"><UserPlus size={14} />Register</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setOpen(!open)} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pb-4 pt-2 flex flex-col gap-1 animate-fade-in shadow-lg">
          {isAuthenticated && <Link to="/products" onClick={() => setOpen(false)} className={link('/products')}>Products</Link>}
          {isAuthenticated && <Link to="/orders" onClick={() => setOpen(false)} className={link('/orders')}>My Orders</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className={link('/admin')}>Admin Dashboard</Link>}
          {isAuthenticated
            ? <button onClick={handleLogout} className="text-left text-sm font-medium text-red-600 dark:text-red-400 px-3 py-2">Logout</button>
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
