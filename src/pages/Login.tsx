import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn, Loader2, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
// @ts-ignore
import logo from '../asset/logo.png'; // Logotip manzili

export default function Login() {
  const signIn = useAuthStore((state) => state.signIn);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center p-6 font-sans">
      {/* FONDEKORATSIYASI */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.03),transparent_25%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-100 bg-[#050505] border border-white/2 rounded-4xl p-10 md:p-12  space-y-10"
      >
        {/* LOGOTIP QISMI */}
        <div className="text-center space-y-8">
           <div className="relative w-24 h-24 mx-auto">
              {/* Logotip orqasidagi nur (Glow) */}
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl " />
              <div className="relative w-full h-full rounded-2xl   items-center justify-center overflow-hidden">
                 <img src={logo} alt="TS Logo" className="w-full h-full object-contain" />
              </div>
           </div>
           
           <div className="space-y-1">
             <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
               ТИХИЕ СТЕНЫ
             </h1>
             <p className="text-[10px] text-primary font-black uppercase tracking-[0.4em] opacity-80">
               ERP SYSTEM V1.0
             </p>
           </div>
        </div>

        {/* FORMA */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                required 
                type="email" 
                placeholder="Email manzilingiz" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30 transition-all font-bold text-sm" 
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                required 
                type="password" 
                placeholder="Parolingiz" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:border-primary/30 transition-all font-bold text-sm" 
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <LogIn size={20} strokeWidth={3} />
                <span>Tizimga kirish</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-white/5">
           <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
             Buxgalteriya va Ombor Nazorati
           </p>
        </div>
      </motion.div>
    </div>
  );
}