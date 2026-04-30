import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, Mail, Lock, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' as 'ADMIN' | 'USER' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/40">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
              <UserPlus size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Create account</h1>
            <p className="text-slate-500 text-sm mt-1">Join SwiftCart today</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" required placeholder="Full name" className="input-field pl-10"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" required placeholder="Email address" className="input-field pl-10"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="password" required placeholder="Password" className="input-field pl-10"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3">
              {(['USER', 'ADMIN'] as const).map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all duration-200 ${form.role === r ? (r === 'ADMIN' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300') : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
                  {r === 'ADMIN' ? <Shield size={14} /> : <User size={14} />}
                  {r}
                </button>
              ))}
            </div>

            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={16} />}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
