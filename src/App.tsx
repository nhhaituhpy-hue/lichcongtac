/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus, ShiftSchedule, DailyNote } from './types.ts';

// Components
import Dashboard from './components/Dashboard';
import CreateTaskModal from './components/CreateTask';
import TaskModal from './components/TaskModal';
import RecurringTaskModal from './components/RecurringTaskModal';
import Login from './components/Login';
import { syncInternetTime, getNow, getVietnamTodayKey, getCurrentWeek, getDaysFromWeek } from './utils/timeUtils';

const LOCAL_STORAGE_KEY = 'dvor_tasks_data';


export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskDate, setCreateTaskDate] = useState<string>('');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

  // Refs to keep track of latest state for async callbacks/intervals
  const tasksRef = useRef<Task[]>([]);
  const selectedTaskRef = useRef<Task | null>(null);
  const isModalOpenRef = useRef(false);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => { isModalOpenRef.current = isModalOpen; }, [isModalOpen]);

  const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms

  const [userRole, setUserRole] = useState<'VIEWER' | 'ADMIN' | null>(() => {
    const savedRole = sessionStorage.getItem('dvor_user_role');
    const loginTimestamp = sessionStorage.getItem('dvor_login_timestamp');

    if (savedRole && loginTimestamp) {
      const elapsed = Date.now() - parseInt(loginTimestamp);
      if (elapsed < SESSION_TIMEOUT) {
        return savedRole as 'VIEWER' | 'ADMIN';
      }
      // Session expired
      sessionStorage.removeItem('dvor_user_role');
      sessionStorage.removeItem('dvor_login_timestamp');
    }
    return null;
  });

  const handleLogin = (role: 'VIEWER' | 'ADMIN') => {
    const now = Date.now();
    setUserRole(role);
    sessionStorage.setItem('dvor_user_role', role);
    sessionStorage.setItem('dvor_login_timestamp', now.toString());
  };

  const handleLogout = () => {
    setUserRole(null);
    sessionStorage.removeItem('dvor_user_role');
    sessionStorage.removeItem('dvor_login_timestamp');
  };

  const [syncStatus, setSyncStatus] = useState<'SAVING' | 'SAVED'>('SAVED');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchTasks = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      let url = `/api/tasks?t=${Date.now()}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Use refs to check current UI state
        if (selectedTaskRef.current && isModalOpenRef.current) {
          const stillExists = data.some(t => t.id === selectedTaskRef.current?.id);
          if (!stillExists) {
            setIsModalOpen(false);
            setSelectedTask(null);
            alert('Công việc bạn đang xem đã bị xóa bởi người dùng khác.');
          }
        }
        
        setTasks(prev => {
          // Create a map of existing tasks by ID
          const taskMap = new Map(prev.map(t => [t.id, t]));
          // Overwrite/Add new tasks
          data.forEach((t: Task) => taskMap.set(t.id, t));
          return Array.from(taskMap.values());
        });
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  }, []); // Stable reference

  const fetchShiftSchedules = useCallback(async (monthParam?: string, startDate?: string, endDate?: string) => {
    try {
      let url = `/api/shift-schedules?t=${Date.now()}`;
      
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (monthParam) {
        url += `&month=${monthParam}`;
      } else {
        const now = getNow();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        url += `&month=${year}-${month}`;
      }

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setShiftSchedules(prev => {
          if (startDate && endDate) {
            // Complex merge for date range: remove existing in that range and add new
            // For simplicity, we can just filter by the months involved if it's easier,
            // or just replace entirely if the app is week-based.
            // But let's just merge by ID for now or replace the whole state if it's small.
            // Actually, the previous logic was month-based.
            // Let's replace the schedules that fall within the fetched months.
            const startMonth = startDate.substring(0, 7);
            const endMonth = endDate.substring(0, 7);
            const filtered = prev.filter(s => s.month !== startMonth && s.month !== endMonth);
            return [...filtered, ...data];
          } else if (monthParam) {
            const filtered = prev.filter(s => s.month !== monthParam);
            return [...filtered, ...data];
          }
          return data;
        });
      }
    } catch (e) {
      console.error('Failed to fetch shift schedules:', e);
    }
  }, []);

  const fetchDailyNotes = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      let url = `/api/daily-notes?t=${Date.now()}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        setDailyNotes(prev => {
          const noteMap = new Map(prev.map(n => [n.date, n]));
          data.forEach((n: DailyNote) => noteMap.set(n.date, n));
          return Array.from(noteMap.values());
        });
      }
    } catch (e) {
      console.error('Failed to fetch daily notes:', e);
    }
  }, []);

  const fetchAllDataForRange = useCallback(() => {
    const [year, week] = selectedWeek.split('-W');
    const days = getDaysFromWeek(year, week);
    if (days.length === 0) return;
    
    // Calculate a 3-week range for preloading (Week -1, Week 0, Week +1)
    const currentStart = new Date(days[0].key);
    
    const preloadStart = new Date(currentStart);
    preloadStart.setDate(preloadStart.getDate() - 7);
    
    const preloadEnd = new Date(currentStart);
    preloadEnd.setDate(preloadEnd.getDate() + 20); // 7 (this week) + 7 (next week) + 6 (to end of next week) = 20
    
    const startDate = preloadStart.toISOString().split('T')[0];
    const endDate = preloadEnd.toISOString().split('T')[0];

    fetchTasks(startDate, endDate);
    fetchDailyNotes(startDate, endDate);
    fetchShiftSchedules(undefined, startDate, endDate);
  }, [selectedWeek, fetchTasks, fetchDailyNotes, fetchShiftSchedules]);

  useEffect(() => {
    syncInternetTime();
    fetchAllDataForRange();

    // Periodically fetch data for real-time updates (every 30 seconds)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllDataForRange();
      }
    }, 30000);

    // Refresh immediately when tab becomes visible or focused
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') {
        fetchAllDataForRange();
      }
    };
    document.addEventListener('visibilitychange', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    // Periodically check for session expiration (every minute)
    const sessionInterval = setInterval(() => {
      const loginTimestamp = sessionStorage.getItem('dvor_login_timestamp');
      if (loginTimestamp) {
        const elapsed = Date.now() - parseInt(loginTimestamp);
        if (elapsed >= SESSION_TIMEOUT) {
          handleLogout();
        }
      }
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(sessionInterval);
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchTasks, fetchAllDataForRange]);

  const handleDeleteTask = async (taskId: string) => {
    setSyncStatus('SAVING');
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== taskId));
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
    } catch (e) {
      console.error('Delete failed:', e);
      setSyncStatus('SAVED');
    }
  };

  const handleDeleteFutureTasks = async (titleToMatch: string) => {
    const todayKey = getVietnamTodayKey();
    const normalizedMatch = titleToMatch.trim().toLowerCase().normalize('NFC');

    const tasksToDelete = tasks.filter(t => {
      const normalizedTitle = t.title.trim().toLowerCase().normalize('NFC');
      const isMatch = normalizedTitle === normalizedMatch;
      const isFutureOrToday = t.date >= todayKey;
      return isMatch && isFutureOrToday;
    });

    if (tasksToDelete.length > 0) {
      setSyncStatus('SAVING');
      try {
        await fetch('/api/tasks/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: tasksToDelete.map(t => t.id) })
        });
        setTasks(prevTasks => prevTasks.filter(t => !tasksToDelete.some(dt => dt.id === t.id)));
        setSyncStatus('SAVED');
        setLastSyncTime(getNow());
      } catch (e) {
        console.error('Bulk delete failed:', e);
        setSyncStatus('SAVED');
      }
    }
    setIsModalOpen(false);
  };

  const handleSaveTask = async (newTask: Task) => {
    setSyncStatus('SAVING');
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      setTasks([...tasks, newTask]);
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
      setIsCreateTaskModalOpen(false);
    } catch (e) {
      console.error('Save failed:', e);
      setSyncStatus('SAVED');
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    // ALWAYS use the latest data from tasksRef to check existence
    const stillExists = tasksRef.current.some(t => t.id === updatedTask.id);

    if (!stillExists) {
      alert('Không thể cập nhật: Công việc này đã bị xóa bởi người dùng khác.');
      setIsModalOpen(false);
      setSelectedTask(null);
      return;
    }

    setSyncStatus('SAVING');
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (!response.ok) throw new Error('Update failed');

      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
      setIsModalOpen(false);
    } catch (e) {
      console.error('Update failed:', e);
      setSyncStatus('SAVED');
      alert('Có lỗi xảy ra khi cập nhật công việc.');
    }
  };

  const handleUpdateDailyNote = async (date: string, content: string) => {
    setSyncStatus('SAVING');
    try {
      const noteId = `note-${date}`;
      const response = await fetch('/api/daily-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, date, content })
      });

      if (!response.ok) throw new Error('Update failed');

      setDailyNotes(prev => {
        const existing = prev.find(n => n.date === date);
        if (existing) {
          return prev.map(n => n.date === date ? { ...n, content } : n);
        } else {
          return [...prev, { id: noteId, date, content }];
        }
      });
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
    } catch (e) {
      console.error('Update failed:', e);
      setSyncStatus('SAVED');
    }
  };

  const handleCreateRecurringTasks = async (data: {
    mode: 'FRIDAY_PRIORITY' | 'FIXED_DAY' | 'DATE_RANGE',
    titleWeekly?: string,
    titleMonthly?: string,
    titleQuarterly?: string,
    titleFixed?: string,
    titleRange?: string,
    dayOfMonth?: number,
    isLastDay?: boolean,
    startDate?: string,
    endDate?: string,
    notes: string
  }) => {
    const currentYear = getNow().getFullYear();
    const newTasks: Task[] = [];

    if (data.mode === 'FIXED_DAY') {
      // Logic for fixed day in month
      for (let month = 0; month < 12; month++) {
        let actualDay = data.dayOfMonth || 1;
        const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();

        if (data.isLastDay) {
          actualDay = lastDayOfMonth;
        } else if (actualDay > lastDayOfMonth) {
          actualDay = lastDayOfMonth;
        }

        const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

        newTasks.push({
          id: `recurring-fixed-${Date.now()}-${month}`,
          title: data.titleFixed || '',
          personnel: [],
          status: TaskStatus.NOT_STARTED,
          date: dateStr,
          notes: data.notes
        });
      }
    } else if (data.mode === 'DATE_RANGE') {
      // Logic for date range
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          newTasks.push({
            id: `range-${Date.now()}-${d.getTime()}`,
            title: data.titleRange || '',
            personnel: [],
            status: TaskStatus.NOT_STARTED,
            date: dateStr,
            notes: data.notes
          });
        }
      }
    } else {
      // Logic for Friday priority
      const isLastFridayOfMonth = (date: Date) => {
        if (date.getDay() !== 5) return false;
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        return nextWeek.getMonth() !== date.getMonth();
      };

      const isLastFridayOfQuarter = (date: Date) => {
        if (!isLastFridayOfMonth(date)) return false;
        const month = date.getMonth();
        return (month + 1) % 3 === 0;
      };

      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 5) {
          let title = '';
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          if (isLastFridayOfQuarter(d)) {
            title = data.titleQuarterly || data.titleMonthly || data.titleWeekly || '';
          } else if (isLastFridayOfMonth(d)) {
            title = data.titleMonthly || data.titleWeekly || '';
          } else {
            title = data.titleWeekly || '';
          }

          if (title) {
            newTasks.push({
              id: `recurring-friday-${Date.now()}-${d.getTime()}`,
              title: title,
              personnel: [],
              status: TaskStatus.NOT_STARTED,
              date: dateStr,
              notes: data.notes
            });
          }
        }
      }
    }

    setSyncStatus('SAVING');
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTasks)
      });
      setTasks([...tasks, ...newTasks]);
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
      setIsRecurringModalOpen(false);
    } catch (e) {
      console.error('Recurring task creation failed:', e);
      setSyncStatus('SAVED');
    }
  };

  const handleImportShiftSchedule = async (schedules: ShiftSchedule[]) => {
    setSyncStatus('SAVING');
    try {
      // First, get the month from the first schedule
      if (schedules.length === 0) {
        setSyncStatus('SAVED');
        return;
      }

      const month = schedules[0].month;

      // Delete existing schedules for this month
      const deleteRes = await fetch(`/api/shift-schedules?month=${month}`, {
        method: 'DELETE'
      });
      if (!deleteRes.ok) {
        const errorData = await deleteRes.json();
        throw new Error((errorData as any).error || 'Không thể xóa lịch cũ');
      }

      // Import new schedules
      const postRes = await fetch('/api/shift-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedules)
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        throw new Error((errorData as any).error || 'Không thể lưu lịch mới');
      }

      // Update local state
      setShiftSchedules(prev => {
        // Remove old schedules for this month
        const filtered = prev.filter(s => s.month !== month);
        // Add new schedules
        return [...filtered, ...schedules];
      });

      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
      alert(`Đã nhập thành công ${schedules.length} ca trực cho tháng ${month}`);
    } catch (e: any) {
      console.error('Import shift schedule failed:', e);
      setSyncStatus('SAVED');
      alert(`Có lỗi xảy ra: ${e.message}`);
    }
  };

  if (!userRole) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden relative">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="DASHBOARD"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Dashboard
                tasks={tasks}
                userRole={userRole}
                onCreateTask={(date: string) => {
                  if (userRole !== 'ADMIN') return;
                  setCreateTaskDate(date);
                  setIsCreateTaskModalOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onTaskClick={handleTaskClick}
                onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
                onLogout={handleLogout}
                syncStatus={syncStatus}
                lastSyncTime={lastSyncTime}
                shiftSchedules={shiftSchedules}
                onImportShiftSchedule={handleImportShiftSchedule}
                selectedWeek={selectedWeek}
                onWeekChange={setSelectedWeek}
                dailyNotes={dailyNotes}
                onUpdateDailyNote={handleUpdateDailyNote}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSave={handleUpdateTask}
        onDeleteFuture={handleDeleteFutureTasks}
        showDeleteFuture={tasks.filter(t => t.title.trim().toLowerCase().normalize('NFC') === selectedTask?.title.trim().toLowerCase().normalize('NFC')).length > 1}
        userRole={userRole}
      />
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        initialDate={createTaskDate}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSave={handleSaveTask}
      />
      <RecurringTaskModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onSave={handleCreateRecurringTasks}
      />
    </div>
  );
}
