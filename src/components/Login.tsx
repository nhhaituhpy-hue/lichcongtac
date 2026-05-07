import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (role: 'VIEWER' | 'ADMIN') => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '123') {
      onLogin('VIEWER');
    } else if (pin === '888888') {
      onLogin('ADMIN');
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden border border-surface-container-highest">
          <div className="bg-primary p-12 text-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl" />

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl mb-6 border border-white/20"
            >
              <Lock size={32} className="text-white" />
            </motion.div>

            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Lịch Công Tác</h1>
            <p className="text-on-primary/70 text-xs font-bold uppercase tracking-widest">Đài DVOR/DME Tuy Hòa</p>
          </div>

          <div className="p-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1">Mã Pin Truy Cập</label>
                <div className="relative">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••"
                    className={`w-full bg-surface-container-low border-2 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.5em] focus:bg-white outline-none transition-all ${error ? 'border-error animate-shake' : 'border-transparent focus:border-primary/20'
                      }`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-[10px] font-black uppercase text-center mt-3 tracking-wider"
                    >
                      Mã PIN không chính xác. Vui lòng thử lại.
                    </motion.p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
              >
                <span>Xác nhận truy cập</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-surface-container flex flex-col gap-4">
              <div className="flex items-center gap-3 text-on-surface-variant/40">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-left flex-1">Phân quyền hệ thống</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container flex items-center gap-2">
                  <User size={14} className="text-on-surface-variant/60" />
                  <span className="text-[9px] font-black uppercase text-on-surface-variant/60">Người xem</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary/60" />
                  <span className="text-[9px] font-black uppercase text-on-surface-variant/60">Quản trị</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-on-surface-variant/30 text-[10px] font-bold uppercase tracking-[0.2em]">
          Technical Support: DVOR/DME Team
        </p>
      </motion.div>
    </div>
  );
}
