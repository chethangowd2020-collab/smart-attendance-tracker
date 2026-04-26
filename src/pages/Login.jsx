import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, GraduationCap, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/40 mb-6"
          >
            <GraduationCap className="text-white" size={32} />
          </motion.div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter mb-2 text-center">TRACKIFY</h1>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] text-center">Your Academic Identity</p>
        </div>

        <div className="bg-zinc-50 p-10 rounded-[3.5rem] border border-zinc-200 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 to-transparent rounded-[3.5rem] pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                <input 
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-2xl p-5 pl-14 text-zinc-900 focus:ring-2 focus:ring-emerald-500/50 outline-none font-bold transition-all placeholder:text-zinc-400"
                  placeholder="name@university.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                <input 
                  type="password" required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-2xl p-5 pl-14 text-zinc-900 focus:ring-2 focus:ring-emerald-500/50 outline-none font-bold transition-all placeholder:text-zinc-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] transition-all font-black uppercase tracking-[0.25em] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              {loading ? "Authenticating..." : <><LogIn size={20} /> Sign In</>}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 font-bold text-sm tracking-tight">
            New to Trackify? 
            <Link to="/register" className="text-white ml-2 hover:text-emerald-400 transition-colors inline-flex items-center gap-2 group">
              Create an account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
