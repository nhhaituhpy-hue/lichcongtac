import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone, ArrowBigDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallGuide() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isStandalone) return;

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Show after 2 seconds
    const showTimer = setTimeout(() => {
      setShow(true);
    }, 2000);

    // Auto hide after 15 seconds
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 7000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[100] md:hidden"
      >
        <div className="bg-surface/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-5 relative overflow-hidden">
          {/* Progress bar for 15s */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className="absolute top-0 left-0 h-1 bg-primary/30"
          />

          <button
            onClick={() => setShow(false)}
            className="absolute top-3 right-3 p-1.5 bg-surface-container rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
              <Smartphone size={24} />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-tight">Cài đặt ứng dụng</h3>
              <p className="text-[11px] font-medium text-on-surface-variant mt-1 leading-relaxed">
                Thêm vào màn hình chính để truy cập nhanh và có trải nghiệm tốt nhất.
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                {platform === 'ios' ? (
                  <div className="flex items-center gap-3 bg-white/40 p-2.5 rounded-xl border border-white/40">
                    <div className="p-1.5 bg-white rounded-md text-blue-500 shadow-sm">
                      <Share size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface">Nhấn nút "Chia sẻ" ở thanh dưới trình duyệt</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white/40 p-2.5 rounded-xl border border-white/40">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-on-surface-variant rounded-full" />
                      <div className="w-1 h-1 bg-on-surface-variant rounded-full" />
                      <div className="w-1 h-1 bg-on-surface-variant rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface">Nhấn biểu tượng 3 chấm ở góc trình duyệt</span>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-white/40 p-2.5 rounded-xl border border-white/40">
                  <div className="p-1.5 bg-white rounded-md text-primary shadow-sm">
                    <PlusSquare size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface">Chọn "Thêm vào MH chính" (Add to Home Screen)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center animate-bounce">
            <ArrowBigDown size={20} className="text-primary/40" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
