import { useState } from 'react';
import { Plus, Clock, Users, Cloud, Calendar, ChevronLeft, ChevronRight, Trash2, Settings } from 'lucide-react';
import { Task, TaskStatus } from '../types.ts';
import { motion } from 'framer-motion';

interface DashboardProps {
  tasks: Task[];
  onCreateTask: (date: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onOpenRecurringModal?: () => void;
  syncStatus: 'SAVING' | 'SAVED';
  lastSyncTime: Date | null;
}

function getDaysFromWeek(yearStr: string, weekStr: string) {
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dayIndex = (jan4.getDay() + 6) % 7; 
  const targetMonday = new Date(year, 0, 4 - dayIndex);
  targetMonday.setDate(targetMonday.getDate() + (week - 1) * 7);

  const days = [];
  const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(targetMonday);
    current.setDate(current.getDate() + i);
    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    days.push({
      label: labels[i],
      date: `${dd}/${mm}/${yyyy}`,
      key: `${yyyy}-${mm}-${dd}`
    });
  }
  return days;
}

function getCurrentWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const configs = {
    [TaskStatus.DONE]: { label: 'Hoàn thành', class: 'text-emerald-600' },
    [TaskStatus.NOT_STARTED]: { label: 'Chưa thực hiện', class: 'text-error' },
    [TaskStatus.CANCELLED]: { label: 'Cancel', class: 'text-on-surface-variant' }
  };

  const config = configs[status];

  return (
    <span className={`text-[11px] font-black uppercase tracking-wider ${config.class}`}>
      {config.label}
    </span>
  );
};

export default function Dashboard({ tasks, onCreateTask, onDeleteTask, onTaskClick, onOpenRecurringModal, syncStatus, lastSyncTime }: DashboardProps) {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [yearStr, weekStr] = selectedWeek.split('-W');
  const displayWeek = weekStr || '42';
  const DAYS = getDaysFromWeek(yearStr, weekStr);

  const handlePrevWeek = () => {
    const year = parseInt(selectedWeek.split('-W')[0]);
    const week = parseInt(selectedWeek.split('-W')[1]);
    if (week > 1) {
      setSelectedWeek(`${year}-W${(week - 1).toString().padStart(2, '0')}`);
    } else {
      setSelectedWeek(`${year - 1}-W52`);
    }
  };

  const handleNextWeek = () => {
    const year = parseInt(selectedWeek.split('-W')[0]);
    const week = parseInt(selectedWeek.split('-W')[1]);
    if (week < 52) {
      setSelectedWeek(`${year}-W${(week + 1).toString().padStart(2, '0')}`);
    } else {
      setSelectedWeek(`${year + 1}-W01`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Header */}
      <div className="px-8 py-6 flex flex-col md:flex-row justify-between md:items-end flex-shrink-0 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-primary tracking-tight uppercase">Bảng Lịch Công Tác Tuần</h1>
            <button 
              onClick={onOpenRecurringModal} 
              title="Cài đặt công việc định kỳ"
              className="p-2 border border-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/10 hover:border-primary/30 rounded-full transition-colors flex items-center justify-center cursor-pointer"
            >
              <Settings size={18} />
            </button>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
              syncStatus === 'SAVING' 
                ? 'bg-primary/10 text-primary border-primary/20' 
                : 'bg-surface-container-highest text-on-surface-variant border-surface-container-highest'
            }`}>
              <Cloud size={14} className={syncStatus === 'SAVING' ? 'animate-pulse' : ''} />
              <span>
                {syncStatus === 'SAVING' ? 'ĐANG LƯU...' : 
                 (lastSyncTime ? `ĐÃ LƯU LÚC ${lastSyncTime.toLocaleTimeString('vi-VN')}` : 'ĐÃ ĐỒNG BỘ')}
              </span>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">
            Đài DVOR/DME Tuy Hòa • {DAYS[0].date} - {DAYS[6].date}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex bg-surface-container-lowest border border-surface-container-highest rounded-lg shadow-sm overflow-hidden">
             <button onClick={handlePrevWeek} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container transition-colors border-r border-surface-container-highest flex items-center justify-center cursor-pointer" title="Tuần trước">
               <ChevronLeft size={16} />
             </button>
             <div className="relative flex items-center group hover:bg-surface-container transition-colors">
               <input 
                 type="week"
                 value={selectedWeek}
                 onChange={(e) => { if (e.target.value) setSelectedWeek(e.target.value) }}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
               />
               <div className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase text-on-surface select-none pointer-events-none">
                 <Calendar size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                 <span>Tuần {displayWeek}</span>
               </div>
             </div>
             <button onClick={handleNextWeek} className="px-3 py-2 text-on-surface-variant hover:bg-surface-container transition-colors border-l border-surface-container-highest flex items-center justify-center cursor-pointer" title="Tuần sau">
               <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* Vertical List Container */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 flex flex-col gap-6">
        {DAYS.map((day) => {
          const dayTasks = tasks.filter(t => t.date === day.key);
          const isWeekend = day.label.includes('7') || day.label.includes('Chủ');
          
          return (
            <div 
              key={day.key} 
              className={`flex flex-col flex-shrink-0 rounded-xl border border-surface-container-highest shadow-sm overflow-hidden ${isWeekend ? 'bg-surface-container-low/50' : 'bg-surface-container-low'}`}
            >
              {/* Day Header */}
              <div className="px-5 py-3 bg-surface-container-low border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-black ${isWeekend ? 'text-primary/70' : 'text-on-surface'}`}>{day.label}</span>
                  <span className="text-sm text-on-surface-variant font-medium">{day.date}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-surface-container border border-surface-container-highest flex items-center justify-center text-xs font-black text-on-surface-variant">
                  {dayTasks.length}
                </div>
              </div>

              {/* Task Grid */}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                  {dayTasks.length === 0 && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); onCreateTask(day.key); }}
                      className="flex items-center justify-between gap-3 p-4 bg-white/50 border border-dashed border-surface-container-highest rounded-xl text-on-surface-variant/60 hover:text-primary hover:border-primary/40 hover:bg-white transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={20} className="group-hover:text-primary transition-colors" />
                        <p className="text-sm font-bold">Chưa có lịch trình</p>
                      </div>
                      <Plus size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {dayTasks.length > 0 && (
                    <>
                      {dayTasks.map(task => (
                        <motion.div
                          key={task.id}
                          layoutId={task.id}
                          onClick={() => onTaskClick(task)}
                          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          className={`p-4 rounded-xl border border-surface-container-highest bg-white shadow-sm flex flex-col md:flex-row md:items-center gap-4 cursor-pointer group border-l-4 ${
                            task.status === TaskStatus.DONE ? 'border-l-emerald-500' :
                            task.status === TaskStatus.NOT_STARTED ? 'border-l-error' :
                            task.status === TaskStatus.CANCELLED ? 'border-l-on-surface-variant' : 'border-l-on-surface-variant/30'
                          }`}
                        >
                          <div className="flex flex-col md:w-32 flex-shrink-0">
                             <StatusBadge status={task.status} />
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-1">
                            <h3 className="text-base font-black text-on-surface leading-snug group-hover:text-primary transition-colors">
                              {task.title}
                            </h3>
                            {task.notes && (
                              <p className="text-sm font-medium text-on-surface-variant/80 border-l-2 border-surface-container pl-2 mt-1">
                                {task.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 md:items-center flex-shrink-0">
                            {task.startTime && (
                              <div className="flex items-center gap-2 text-on-surface-variant text-sm font-medium">
                                <Clock size={16} className="opacity-50" />
                                <span>{task.startTime} - {task.endTime}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-on-surface-variant text-sm font-medium w-full max-w-[200px]">
                              <Users size={16} className="opacity-50" />
                              <span className="truncate">{task.personnel.join(', ')}</span>
                            </div>
                            <div className="flex items-center justify-end pl-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                 className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-md md:opacity-0 group-hover:opacity-100 transition-all"
                                 title="Xóa công việc"
                               >
                                 <Trash2 size={18} />
                               </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCreateTask(day.key); }}
                        className="w-full py-3 border-2 border-dashed border-surface-container-highest rounded-xl text-on-surface-variant/60 hover:text-primary hover:border-primary/40 hover:bg-white transition-all flex items-center justify-center gap-2 text-sm font-bold cursor-pointer"
                      >
                        <Plus size={20} />
                        <span>Thêm việc</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
