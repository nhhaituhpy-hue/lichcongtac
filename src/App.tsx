/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from './types.ts';

// Components
import Dashboard from './components/Dashboard';
import CreateTaskModal from './components/CreateTask';
import TaskModal from './components/TaskModal';
import RecurringTaskModal from './components/RecurringTaskModal';
import Login from './components/Login';
import { syncInternetTime, getNow, getVietnamTodayKey } from './utils/timeUtils';

const LOCAL_STORAGE_KEY = 'dvor_tasks_data';


export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskDate, setCreateTaskDate] = useState<string>('');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  
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

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  };

  useEffect(() => {
    syncInternetTime();
    fetchTasks();
    
    // Periodically check for session expiration (every minute)
    const interval = setInterval(() => {
      const loginTimestamp = sessionStorage.getItem('dvor_login_timestamp');
      if (loginTimestamp) {
        const elapsed = Date.now() - parseInt(loginTimestamp);
        if (elapsed >= SESSION_TIMEOUT) {
          handleLogout();
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
    setSyncStatus('SAVING');
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      setSyncStatus('SAVED');
      setLastSyncTime(getNow());
      setIsModalOpen(false);
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
