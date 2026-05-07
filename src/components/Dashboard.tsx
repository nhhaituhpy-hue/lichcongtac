import { useState } from 'react';
import { Plus, Clock, Users, Cloud, Calendar, ChevronLeft, ChevronRight, Trash2, Settings, LogOut } from 'lucide-react';
import { Task, TaskStatus } from '../types.ts';
import { motion } from 'framer-motion';
import { getNow, getVietnamTodayKey } from '../utils/timeUtils';
import InstallGuide from './InstallGuide';

interface DashboardProps {
  tasks: Task[];
  onCreateTask: (date: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onOpenRecurringModal?: () => void;
  onLogout: () => void;
  userRole: 'VIEWER' | 'ADMIN';
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
  const now = getNow();
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

export default function Dashboard({ tasks, onCreateTask, onDeleteTask, onTaskClick, onOpenRecurringModal, onLogout, userRole, syncStatus, lastSyncTime }: DashboardProps) {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [yearStr, weekStr] = selectedWeek.split('-W');
  const displayWeek = weekStr || '42';
  const DAYS = getDaysFromWeek(yearStr, weekStr);

  const todayKey = getVietnamTodayKey();

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
    <div className="flex flex-col h-full bg-surface-container-lowest md:bg-surface">
      {/* View Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row justify-between md:items-center flex-shrink-0 gap-3 md:gap-4 border-b border-surface-container md:border-none sticky top-0 bg-surface/80 backdrop-blur-md z-30">
        <div className="flex flex-col gap-1 md:gap-2">
          <div className="flex items-center gap-3 md:gap-4">
            <h1 className="text-xl md:text-3xl font-black text-primary tracking-tight uppercase">Lịch Công Tác</h1>
            <div className="flex items-center gap-2">
              {userRole === 'ADMIN' && (
                <button
                  onClick={onOpenRecurringModal}
                  title="Cài đặt công việc định kỳ"
                  className="p-2 border border-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/10 hover:border-primary/30 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Settings size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              )}
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 border border-surface-container-highest text-on-surface-variant hover:text-error hover:bg-error/10 hover:border-error/30 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <LogOut size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] md:text-[10px] font-bold border transition-colors ${syncStatus === 'SAVING'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-surface-container-highest text-on-surface-variant border-surface-container-highest'
              }`}>
              <Cloud size={12} className={syncStatus === 'SAVING' ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">
                {syncStatus === 'SAVING' ? 'ĐANG LƯU...' :
                  (lastSyncTime ? `ĐÃ LƯU LÚC ${lastSyncTime.toLocaleTimeString('vi-VN')}` : 'ĐÃ ĐỒNG BỘ')}
              </span>
              <span className="sm:hidden">
                {syncStatus === 'SAVING' ? '...' : (lastSyncTime ? lastSyncTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'OK')}
              </span>
            </div>
          </div>
          <p className="text-on-surface-variant text-[11px] md:text-sm font-medium">
            Đài DVOR/DME Tuy Hòa • <span className="text-on-surface font-bold">{DAYS[0].date} - {DAYS[6].date}</span>
          </p>
        </div>

        <div className="flex gap-2 items-center justify-between md:justify-end">
          <div className="flex flex-1 md:flex-none bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-hidden">
            <button onClick={handlePrevWeek} className="flex-none px-3 md:px-3 py-2.5 md:py-2 text-on-surface-variant hover:bg-surface-container transition-colors border-r border-surface-container-highest flex items-center justify-center cursor-pointer" title="Tuần trước">
              <ChevronLeft size={18} />
            </button>
            <div className="relative flex-1 md:flex-none flex items-center group hover:bg-surface-container transition-colors">
              <input
                type="week"
                value={selectedWeek}
                onChange={(e) => { if (e.target.value) setSelectedWeek(e.target.value) }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 text-[11px] md:text-xs font-black uppercase text-on-surface select-none pointer-events-none w-full whitespace-nowrap">
                <Calendar size={14} className="text-on-surface-variant group-hover:text-primary transition-colors hidden sm:block" />
                <span>Tuần {displayWeek}</span>
              </div>
            </div>
            <button onClick={handleNextWeek} className="flex-none px-3 md:px-3 py-2.5 md:py-2 text-on-surface-variant hover:bg-surface-container transition-colors border-l border-surface-container-highest flex items-center justify-center cursor-pointer" title="Tuần sau">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Vertical List Container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 flex flex-col gap-4 md:gap-6 pt-4">
        {DAYS.map((day) => {
          const dayTasks = tasks.filter(t => t.date === day.key);
          const isWeekend = day.label.includes('7') || day.label.includes('Chủ');
          const isToday = day.key === todayKey;

          return (
            <div
              key={day.key}
              className={`flex flex-col flex-shrink-0 rounded-2xl border shadow-sm overflow-hidden transition-all ${isToday
                  ? 'border-2 border-primary bg-primary/[0.05] shadow-lg md:scale-[1.01] z-10'
                  : isWeekend
                    ? 'border-surface-container-highest bg-surface-container-low/50'
                    : 'border-surface-container-highest bg-surface-container-low'
                }`}
            >
              {/* Day Header - Sticky on Mobile */}
              <div className={`px-4 md:px-5 py-2.5 md:py-3 border-b flex justify-between items-center sticky top-0 z-20 ${isToday
                  ? 'bg-primary/20 border-primary/30 backdrop-blur-md'
                  : 'bg-surface-container-low/90 border-surface-container-highest backdrop-blur-md'
                }`}>
                <div className="flex items-center gap-3 md:gap-4">
                  <span className={`text-base md:text-lg font-black ${isWeekend ? 'text-primary/70' : 'text-on-surface'}`}>{day.label}</span>
                  <span className="text-xs md:text-sm text-on-surface-variant font-bold opacity-70">{day.date}</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-surface-container border border-surface-container-highest flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                  {dayTasks.length} VIỆC
                </div>
              </div>

              {/* Task Grid */}
              <div className="p-3 md:p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:gap-3">
                  {dayTasks.length === 0 && (
                    <div
                      onClick={(e) => {
                        if (userRole !== 'ADMIN') return;
                        e.stopPropagation();
                        onCreateTask(day.key);
                      }}
                      className={`flex items-center justify-between gap-3 p-4 md:p-5 bg-white/50 border border-dashed border-surface-container-highest rounded-xl text-on-surface-variant/60 transition-all ${userRole === 'ADMIN' ? 'hover:text-primary hover:border-primary/40 hover:bg-white cursor-pointer group' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className={userRole === 'ADMIN' ? "group-hover:text-primary transition-colors" : ""} />
                        <p className="text-xs md:text-sm font-bold uppercase tracking-wider">Chưa có lịch trình</p>
                      </div>
                      {userRole === 'ADMIN' && <Plus size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  )}
                  {dayTasks.length > 0 && (
                    <>
                      {dayTasks.map(task => (
                        <motion.div
                          key={task.id}
                          layoutId={task.id}
                          onClick={() => onTaskClick(task)}
                          whileHover={{ y: -2 }}
                          className={`p-3 md:p-4 rounded-xl border border-surface-container-highest bg-white shadow-sm flex flex-col md:flex-row md:items-center gap-2 md:gap-4 cursor-pointer group border-l-4 transition-all active:scale-[0.98] ${task.status === TaskStatus.DONE ? 'border-l-emerald-500' :
                              task.status === TaskStatus.NOT_STARTED ? 'border-l-error' :
                                task.status === TaskStatus.CANCELLED ? 'border-l-on-surface-variant' : 'border-l-on-surface-variant/30'
                            }`}
                        >
                          <div className="flex items-center justify-between md:w-32 flex-shrink-0">
                            <StatusBadge status={task.status} />
                            <div className="md:hidden">
                              <ChevronRight size={16} className="text-on-surface-variant/30" />
                            </div>
                          </div>
 
                          <div className="flex-1 flex flex-col gap-0.5 md:gap-1">
                            <h3 className="text-sm md:text-base font-black text-on-surface leading-tight md:leading-snug group-hover:text-primary transition-colors">
                              {task.title}
                            </h3>
                            {task.notes && (
                              <p className="text-[11px] md:text-sm font-medium text-on-surface-variant/70 border-l-2 border-surface-container pl-2 mt-0.5 line-clamp-2 md:line-clamp-none">
                                {task.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-row md:items-center justify-between md:justify-start gap-4 flex-shrink-0 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-surface-container-lowest md:border-none">
                            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
                              {task.startTime && (
                                <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] md:text-sm font-bold">
                                  <Clock size={14} className="opacity-40" />
                                  <span>{task.startTime} - {task.endTime}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] md:text-sm font-bold max-w-[150px] md:max-w-[200px]">
                                <Users size={14} className="opacity-40" />
                                <span className="truncate">{task.personnel.join(', ')}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              {userRole === 'ADMIN' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                  className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-md md:opacity-0 group-hover:opacity-100 transition-all active:bg-error/20"
                                  title="Xóa công việc"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {userRole === 'ADMIN' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onCreateTask(day.key); }}
                          className="w-full py-3 border-2 border-dashed border-surface-container-highest rounded-xl text-on-surface-variant/60 hover:text-primary hover:border-primary/40 hover:bg-white transition-all flex items-center justify-center gap-2 text-sm font-bold cursor-pointer"
                        >
                          <Plus size={20} />
                          <span>Thêm việc</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <InstallGuide />
    </div>
  );
}
