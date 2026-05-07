import React, { useState } from 'react';
import { Save, User, Flag, Calendar, Hash, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../types.ts';

interface CreateTaskModalProps {
  isOpen: boolean;
  initialDate?: string;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export default function CreateTaskModal({ isOpen, initialDate, onClose, onSave }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !initialDate) return; // Simple validation
    
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      personnel: personnel ? [personnel] : [],
      status,
      date: initialDate,
      notes,
    };
    onSave(newTask);
    
    // Reset form
    setTitle('');
    setPersonnel('');
    setStatus(TaskStatus.NOT_STARTED);
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
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface-container-lowest w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-tight uppercase tracking-tight">Tạo Công Việc Mới</h2>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Thêm nhiệm vụ mới vào lịch công tác tuần</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto">
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Chi tiết công việc</label>
                  <textarea 
                    rows={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Nhập chi tiết công việc kỹ thuật..."
                    className="w-full bg-surface border border-surface-container-highest rounded-xl px-4 py-3 text-base font-medium focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-on-surface-variant/40"
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
                        className="w-full bg-surface border border-surface-container-highest rounded-xl pl-10 pr-4 py-3 text-base font-bold appearance-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none cursor-pointer"
                      >
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
                        className="w-full bg-surface border border-surface-container-highest rounded-xl pl-10 pr-4 py-3 text-base font-bold appearance-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none cursor-pointer"
                      >
                        <option value={TaskStatus.NOT_STARTED}>Chưa thực hiện</option>
                        <option value={TaskStatus.DONE}>Hoàn thành</option>
                        <option value={TaskStatus.CANCELLED}>Cancel</option>
                      </select>
                    </div>
                  </div>
                </div>



                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ghi chú vận hành</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Các yêu cầu thêm hoặc thiết bị cần thiết..."
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-3 text-base font-medium focus:bg-white focus:border-primary/50 outline-none transition-all resize-none placeholder:text-on-surface-variant/40"
                  />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 bg-surface-container/50 flex justify-end gap-3 border-t border-surface-container">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-surface-container-highest text-xs font-black uppercase hover:bg-surface-container transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase hover:bg-primary-container transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Save size={16} />
                <span>Lưu công việc</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
