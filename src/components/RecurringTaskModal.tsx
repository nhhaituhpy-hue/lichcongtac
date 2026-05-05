import React, { useState } from 'react';
import { X, RefreshCw, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { title: string; dayOfMonth: number; notes: string }) => void;
}

export default function RecurringTaskModal({ isOpen, onClose, onSave }: RecurringTaskModalProps) {
  const [title, setTitle] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title || !dayOfMonth) return;
    
    onSave({ title, dayOfMonth, notes });
    
    setTitle('');
    setDayOfMonth(5);
    setNotes('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-scrim/30 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-xl overflow-hidden z-10 border border-surface-container border-t-white/20"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-surface-container-lowest border-b border-surface-container flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-tertiary to-primary" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-tight uppercase tracking-tight">Tạo Công Việc Định Kỳ</h2>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Thiết lập tự động tạo công việc hàng tháng</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tên công việc</label>
                  <textarea 
                    rows={2}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="VD: Chạy máy phát điện không tải định kỳ lần 1"
                    className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ngày thực hiện (Mỗi tháng)</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                      <input 
                        type="number"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                        required
                        className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ghi chú</label>
                  <textarea 
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="VD: Ghi vào file excel theo dõi; Lập Báo cáo Hệ thống điện tuần xx..."
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-primary/30 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-surface-container/50 flex justify-end gap-3 border-t border-surface-container">
              <button 
                onClick={onClose}
                type="button"
                className="px-6 py-2.5 rounded-xl border border-surface-container-highest text-xs font-black uppercase hover:bg-surface-container transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase hover:bg-primary-container transition-all shadow-lg shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2">
                <RefreshCw size={16} />
                <span>Tạo hàng loạt</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
