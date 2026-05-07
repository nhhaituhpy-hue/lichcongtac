import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Calendar, Clock, Layers, List, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNow, getVietnamTodayKey } from '../utils/timeUtils';

type RecurringMode = 'FRIDAY_PRIORITY' | 'FIXED_DAY' | 'QUICK_REPORT' | 'DATE_RANGE';

const REPORT_TYPES = [
  "Báo cáo Thực hiện các biện pháp giảm thiểu rủi ro",
  "Báo cáo An ninh hàng không - Bảo vệ",
  "Báo cáo PCCC-CNCH và PCTT-TKCN",
  "Báo cáo Hiện trạng công trình xây dựng",
  "Báo cáo Tĩnh không",
  "Báo cáo Tự kiểm tra hàng tháng",
  "Chạy thử máy phát điện không tải định kỳ lần 1",
  "Chạy thử máy phát điện không tải định kỳ lần 2",
  "Chạy thử máy phát điện không tải định kỳ lần 3",
  "Chạy thử máy phát điện có tải"
];

interface RecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    mode: RecurringMode;
    // Friday Priority fields
    titleWeekly?: string;
    titleMonthly?: string;
    titleQuarterly?: string;
    // Fixed Day / Quick Report fields
    titleFixed?: string;
    dayOfMonth?: number;
    isLastDay?: boolean;
    // Date Range fields
    titleRange?: string;
    startDate?: string;
    endDate?: string;
    // Common
    notes: string;
  }) => void;
}

export default function RecurringTaskModal({ isOpen, onClose, onSave }: RecurringTaskModalProps) {
  const [mode, setMode] = useState<RecurringMode>('FRIDAY_PRIORITY');

  // Friday Priority states
  const [titleWeekly, setTitleWeekly] = useState('');
  const [titleMonthly, setTitleMonthly] = useState('');
  const [titleQuarterly, setTitleQuarterly] = useState('');

  // Fixed Day states
  const [titleFixed, setTitleFixed] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isLastDay, setIsLastDay] = useState(false);
  
  // Quick Report states
  const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0]);

  // Date Range states
  const [titleRange, setTitleRange] = useState('Thực hiện công việc tăng cường an ninh cấp độ 1');
  const [startDate, setStartDate] = useState(getVietnamTodayKey());
  const [endDate, setEndDate] = useState(getVietnamTodayKey());

  const [notes, setNotes] = useState('');

  // Update notes/title when switching modes
  useEffect(() => {
    if (mode === 'QUICK_REPORT') {
      setNotes('');
    } else if (mode === 'DATE_RANGE') {
      setTitleRange('Thực hiện công việc tăng cường an ninh cấp độ 1');
      setNotes('');
    } else {
      setNotes('');
    }
  }, [mode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (mode === 'FRIDAY_PRIORITY') {
      if (!titleWeekly && !titleMonthly && !titleQuarterly) return;
      onSave({ mode, titleWeekly, titleMonthly, titleQuarterly, notes });
    } else if (mode === 'FIXED_DAY') {
      if (!titleFixed || (!dayOfMonth && !isLastDay)) return;
      onSave({ mode, titleFixed, dayOfMonth, isLastDay, notes });
    } else if (mode === 'QUICK_REPORT') {
      onSave({ mode: 'FIXED_DAY', titleFixed: selectedReport, dayOfMonth, isLastDay, notes });
    } else if (mode === 'DATE_RANGE') {
      if (!titleRange || !startDate || !endDate) return;
      onSave({ mode, titleRange, startDate, endDate, notes });
    }

    // Reset
    setTitleWeekly('');
    setTitleMonthly('');
    setTitleQuarterly('');
    setTitleFixed('');
    setDayOfMonth(1);
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
            className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-3xl shadow-xl overflow-hidden z-10 border border-surface-container border-t-white/20 flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-surface-container-lowest border-b border-surface-container flex justify-between items-center relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-tertiary to-primary" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface leading-tight uppercase tracking-tight">Cấu Hình Lịch Định Kỳ</h2>
                  <p className="text-xs font-medium text-on-surface-variant mt-1">Chọn loại chu kỳ và thiết lập nội dung</p>
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
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* Mode Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Loại chu kỳ lặp</label>
                  <div className="relative">
                    <List size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as RecurringMode)}
                      className="w-full bg-surface-container-low border-2 border-transparent rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none focus:border-primary/30 focus:bg-white outline-none cursor-pointer transition-all">
                      <option value="FRIDAY_PRIORITY">Báo cáo kỹ thuật thứ 6 hàng tuần (Ưu tiên Tháng/Quý)</option>
                      <option value="FIXED_DAY">Công việc cố định trong tháng (Tùy chỉnh)</option>
                      <option value="QUICK_REPORT">Báo cáo định kỳ / Chạy thử máy phát điện</option>
                      <option value="DATE_RANGE">Khoảng thời gian (Tăng cường an ninh...)</option>
                    </select>
                  </div>
                </div>

                {mode === 'FRIDAY_PRIORITY' && (
                  <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                        <Clock size={14} /> Công việc hàng tuần (Thứ 6)
                      </label>
                      <textarea
                        rows={1}
                        value={titleWeekly}
                        onChange={(e) => setTitleWeekly(e.target.value)}
                        placeholder="VD: Báo cáo kỹ thuật tuần"
                        className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary">
                        <Calendar size={14} /> Công việc Thứ 6 cuối tháng
                      </label>
                      <textarea
                        rows={1}
                        value={titleMonthly}
                        onChange={(e) => setTitleMonthly(e.target.value)}
                        placeholder="VD: Báo cáo kỹ thuật tháng"
                        className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-error">
                        <Layers size={14} /> Công việc Thứ 6 cuối quý
                      </label>
                      <textarea
                        rows={1}
                        value={titleQuarterly}
                        onChange={(e) => setTitleQuarterly(e.target.value)}
                        placeholder="VD: Báo cáo kỹ thuật quý"
                        className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-primary/80 uppercase leading-relaxed italic">
                        * Lưu ý: Hệ thống sẽ ưu tiên tạo công việc Quý {'>'} Tháng {'>'} Tuần nếu các ngày Thứ 6 trùng nhau.
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'FIXED_DAY' && (
                  <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary">Nội dung công việc</label>
                      <textarea
                        rows={2}
                        value={titleFixed}
                        onChange={(e) => setTitleFixed(e.target.value)}
                        placeholder="VD: Gửi biên bản họp đài"
                        className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="flex flex-col gap-4 bg-surface-container-low/50 p-4 rounded-2xl border border-surface-container">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary">Ngày thực hiện trong tháng</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                          <input
                            type="number"
                            min="1"
                            max="31"
                            disabled={isLastDay}
                            value={dayOfMonth}
                            onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none disabled:opacity-50 disabled:bg-surface-container-highest transition-all"
                          />
                        </div>
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={isLastDay}
                            onChange={(e) => setIsLastDay(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-all duration-300" />
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4" />
                        </div>
                        <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Thực hiện vào ngày cuối cùng của mỗi tháng</span>
                      </label>
                    </div>
                  </div>
                )}

                {mode === 'QUICK_REPORT' && (
                  <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary">Chọn mẫu nội dung</label>
                      <div className="relative">
                        <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                        <select
                          value={selectedReport}
                          onChange={(e) => setSelectedReport(e.target.value)}
                          className="w-full bg-surface-container-low border-2 border-transparent rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none focus:border-primary/30 focus:bg-white outline-none cursor-pointer transition-all">
                          {REPORT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 bg-surface-container-low/50 p-4 rounded-2xl border border-surface-container">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary">Ngày thực hiện trong tháng</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                          <input
                            type="number"
                            min="1"
                            max="31"
                            disabled={isLastDay}
                            value={dayOfMonth}
                            onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none disabled:opacity-50 disabled:bg-surface-container-highest transition-all"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={isLastDay}
                            onChange={(e) => setIsLastDay(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-all duration-300" />
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4" />
                        </div>
                        <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Thực hiện vào ngày cuối cùng của mỗi tháng</span>
                      </label>
                    </div>
                  </div>
                )}

                {mode === 'DATE_RANGE' && (
                  <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary">Nội dung công việc</label>
                      <textarea
                        rows={2}
                        value={titleRange}
                        onChange={(e) => setTitleRange(e.target.value)}
                        placeholder="VD: Thực hiện công việc tăng cường an ninh cấp độ 1"
                        className="w-full bg-surface border border-surface-container rounded-xl px-4 py-3 text-sm font-medium focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary">Từ ngày</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary">Đến ngày</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-surface border border-surface-container rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ghi chú chung</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thực hiện công việc..."
                    className="w-full bg-surface-container-low border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-primary/30 outline-none transition-all resize-none placeholder:text-on-surface-variant/30"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-surface-container/50 flex justify-end gap-3 border-t border-surface-container flex-shrink-0">
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
                <span>{mode === 'DATE_RANGE' ? 'Tạo hàng loạt theo khoảng ngày' : `Tạo lịch cho năm ${getNow().getFullYear()}`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
