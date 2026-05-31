import { useState, useEffect } from 'react';
import { X, BarChart3, CheckCircle2, AlertCircle, HelpCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../types.ts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string; // Format: YYYY-MM
}

export default function ReportModal({ isOpen, onClose, currentMonth }: ReportModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentMonth);
    }
  }, [isOpen, currentMonth]);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthDisplay = `Tháng ${parseInt(monthStr)}/${yearStr}`;

  useEffect(() => {
    if (!isOpen) return;

    const fetchMonthTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        
        const response = await fetch(`/api/tasks?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu báo cáo');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      } catch (err: any) {
        console.error('Fetch month tasks error:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthTasks();
  }, [isOpen, selectedMonth, yearStr, monthStr]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const prevDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthStr = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${prevYear}-${prevMonthStr}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const nextDate = new Date(parseInt(year), parseInt(month), 1);
    const nextYear = nextDate.getFullYear();
    const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextYear}-${nextMonthStr}`);
  };

  // Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const notStartedTasks = tasks.filter(t => t.status === TaskStatus.NOT_STARTED).length;
  const cancelledTasks = tasks.filter(t => t.status === TaskStatus.CANCELLED).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[95%] md:w-full max-w-lg max-h-[90vh] bg-surface rounded-3xl shadow-2xl overflow-hidden z-10 border border-surface-container flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-surface-container flex justify-between items-center relative overflow-hidden flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-black text-on-surface uppercase tracking-tight">Thống Kê Báo Cáo</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={handlePrevMonth}
                      title="Tháng trước"
                      className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-all cursor-pointer active:scale-90"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[11px] md:text-xs font-bold text-primary uppercase tracking-wider">{monthDisplay}</span>
                    <button
                      onClick={handleNextMonth}
                      title="Tháng sau"
                      className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-all cursor-pointer active:scale-90"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-on-surface-variant/70 animate-pulse">Đang tổng hợp dữ liệu...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center text-error">
                  <AlertCircle size={40} className="opacity-80" />
                  <p className="text-sm font-bold">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all"
                  >
                    Đóng
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Gauge Metric Card */}
                  <div className="p-5 bg-surface-container-lowest border border-surface-container rounded-2xl flex items-center justify-between gap-6 shadow-sm">
                    <div className="flex-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/70">Tỷ lệ hoàn thành</h3>
                    </div>

                    {/* Circular Indicator */}
                    <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="stroke-surface-container fill-none"
                          strokeWidth="6"
                        />
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="stroke-primary fill-none"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 32}
                          initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - completionRate / 100) }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-on-surface">{completionRate}%</span>
                    </div>
                  </div>

                  {/* Status Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Total Tasks Card */}
                    <div className="p-4 bg-primary/[0.03] border border-primary/10 rounded-2xl flex flex-col gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">Tổng số công việc</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary">{totalTasks}</span>
                        <span className="text-xs font-bold text-on-surface-variant/60">đầu việc</span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-medium mt-1">
                        Đang xem {monthDisplay}
                      </div>
                    </div>

                    {/* Completed Tasks Card */}
                    <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Hoàn thành</span>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-600">{completedTasks}</span>
                        <span className="text-xs font-bold text-on-surface-variant/60">đầu việc</span>
                      </div>
                      <div className="text-[10px] text-emerald-600/70 font-semibold mt-1">
                        Đã xử lý xong xuôi
                      </div>
                    </div>

                    {/* Not Started Tasks Card */}
                    <div className="p-4 bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Chưa hoàn thành</span>
                        <HelpCircle size={14} className="text-amber-500" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-amber-600">{notStartedTasks}</span>
                        <span className="text-xs font-bold text-on-surface-variant/60">đầu việc</span>
                      </div>
                      <div className="text-[10px] text-amber-600/70 font-semibold mt-1">
                        Chưa thực hiện hoặc đang làm
                      </div>
                    </div>

                    {/* Cancelled Tasks Card */}
                    <div className="p-4 bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Cancel</span>
                        <XCircle size={14} className="text-rose-500" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-rose-600">{cancelledTasks}</span>
                        <span className="text-xs font-bold text-on-surface-variant/60">đầu việc</span>
                      </div>
                      <div className="text-[10px] text-rose-600/70 font-semibold mt-1">
                        Đã hủy hoặc hoãn lại
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-surface-container/50 border-t border-surface-container flex justify-end flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase hover:bg-primary-container transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
