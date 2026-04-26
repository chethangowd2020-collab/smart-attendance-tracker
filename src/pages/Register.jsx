import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, LogIn, User, Fingerprint, GraduationCap, ArrowLeft } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return alert("Passwords don't match");
    }
    if (usn.length !== 10) {
      return alert("USN must be exactly 10 characters");
    }
    
    setLoading(true);
    const success = await register(email, password, { name, usn });
    setLoading(false);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex flex-col items-center justify-center py-20 px-6 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10 font-sans"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-600/40 mb-6"
          >
            <GraduationCap className="text-white" size={28} />
          </motion.div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2 uppercase">Create Account</h1>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Join the Trackify Community</p>
        </div>

        <div className="bg-zinc-50 dark:bg-white/[0.02] p-10 rounded-[3.5rem] border border-zinc-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/5 to-emerald-600/5 pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                  <input 
                    type="text" required
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 outline-none font-bold uppercase transition-all placeholder:text-zinc-400"
                    placeholder="JOHN DOE"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">10-Digit USN</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                  <input 
                    type="text" required maxLength={10}
                    value={usn}
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 outline-none font-bold uppercase tracking-widest transition-all placeholder:text-zinc-400"
                    placeholder="1MS22CS001"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                <input 
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none font-bold transition-all placeholder:text-zinc-400"
                  placeholder="name@university.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="password" required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 pl-12 text-white focus:ring-2 focus:ring-white/20 outline-none font-bold transition-all placeholder:text-gray-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="password" required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 pl-12 text-white focus:ring-2 focus:ring-white/20 outline-none font-bold transition-all placeholder:text-gray-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-emerald-600 text-white rounded-[2.5rem] transition-all font-black uppercase tracking-[0.25em] shadow-2xl shadow-purple-600/30 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? "Creating Account..." : <><UserPlus size={20} /> Sign Up</>}
            </button>
          </form>
        </div>

        <div className="mt-10 text-center">
          <p className="text-zinc-500 font-bold text-sm tracking-tight">
            Already have an account? 
            <Link to="/login" className="text-zinc-900 dark:text-white ml-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center gap-2 underline underline-offset-4 decoration-purple-500/30">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
