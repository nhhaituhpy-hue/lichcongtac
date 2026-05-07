import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, User, Flag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../types.ts';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (task: Task) => void;
  onDeleteFuture: (title: string) => void;
  showDeleteFuture: boolean;
  userRole: 'VIEWER' | 'ADMIN';
}

export default function TaskModal({ isOpen, onClose, task, onSave, onDeleteFuture, showDeleteFuture, userRole }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setPersonnel(task.personnel[0] || '');
      setStatus(task.status);
      setNotes(task.notes || '');
    }
  }, [task]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task) return;
    
    onSave({
      ...task,
      title,
      personnel: personnel ? [personnel] : [],
      status,
      notes
    });
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
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-3xl shadow-xl overflow-hidden z-10 border border-surface-container border-t-white/20 flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-surface-container-lowest border-b border-surface-container flex justify-between items-center relative overflow-hidden flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-tight uppercase tracking-tight">Chi Tiết Công Việc</h2>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Cập nhật thông tin và trạng thái nhiệm vụ</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Chi tiết công việc</label>
                  <textarea 
                    rows={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={userRole === 'VIEWER'}
                    placeholder="Nhập chi tiết công việc kỹ thuật..."
                    className={`w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30 ${userRole === 'VIEWER' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Người thực hiện</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                      <select 
                        value={personnel}
                        onChange={(e) => setPersonnel(e.target.value)}
                        className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none cursor-pointer">
                        <option value="">-- Để trống --</option>
                        <option>Văn Ngọc Huy</option>
                        <option>Nguyễn Hoàng Hải</option>
                        <option>Lương Minh Tuấn</option>
                        <option>Châu Trọng Lĩnh</option>
                        <option>Lê Minh Hoàng</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Trạng thái hiện tại</label>
                    <div className="relative">
                      <Flag size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                      <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none cursor-pointer">
                        <option value={TaskStatus.NOT_STARTED}>Chưa thực hiện</option>
                        <option value={TaskStatus.DONE}>Hoàn thành</option>
                        <option value={TaskStatus.CANCELLED}>Cancel</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ghi chú vận hành</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Các yêu cầu thêm hoặc thiết bị cần thiết..."
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-primary/30 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-surface-container/50 flex justify-between items-center border-t border-surface-container flex-shrink-0">
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  type="button"
                  className="px-6 py-2.5 rounded-xl border border-surface-container-highest text-xs font-black uppercase hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                {userRole === 'ADMIN' && showDeleteFuture && (
                  <button 
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả các lần lặp của công việc "${task?.title}" từ hôm nay trở đi không?`)) {
                        onDeleteFuture(task?.title || '');
                      }
                    }}
                    type="button"
                    className="px-6 py-2.5 rounded-xl border border-error/30 text-error text-xs font-black uppercase hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span>Xóa các lần lặp sau này</span>
                  </button>
                )}
              </div>
              <button 
                type="button"
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase hover:bg-primary-container transition-all shadow-lg shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2">
                <Save size={16} />
                <span>Cập nhật công việc</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
