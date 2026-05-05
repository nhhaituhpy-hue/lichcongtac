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

const LOCAL_STORAGE_KEY = 'dvor_tasks_data';

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Kiểm tra thông số phát xạ DVOR',
    startTime: '08:00',
    endTime: '10:00',
    personnel: ['Nguyễn Văn A', 'Trần Văn B'],
    status: TaskStatus.DONE,
    date: '2026-10-12',
    equipmentId: 'DVOR-01'
  },
  {
    id: '2',
    title: 'Vệ sinh công nghiệp phòng máy DME',
    personnel: ['Lê Thị C'],
    status: TaskStatus.DONE,
    date: '2026-10-12',
    equipmentId: 'DME-02'
  },
  {
    id: '3',
    title: 'Bảo dưỡng ắc quy trạm nguồn',
    startTime: '14:00',
    endTime: '16:30',
    personnel: ['Phạm Văn D'],
    status: TaskStatus.NOT_STARTED,
    date: '2026-10-13',
    equipmentId: 'Power-SYS'
  },
  {
    id: '4',
    title: 'Kiểm tra hệ thống PCCC',
    personnel: ['Nguyễn Văn A'],
    status: TaskStatus.NOT_STARTED,
    date: '2026-10-14',
    equipmentId: 'PCCC-01'
  },
  {
    id: '5',
    title: 'Cập nhật nhật ký kỹ thuật tuần trước',
    personnel: ['Trần Văn B'],
    status: TaskStatus.NOT_STARTED,
    date: '2026-10-14'
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => {
          if (t.status === 'IN_PROGRESS' || t.status === 'OVERDUE') {
            return { ...t, status: TaskStatus.NOT_STARTED };
          }
          if (t.status === 'FAILED') {
            return { ...t, status: TaskStatus.CANCELLED };
          }
          return t;
        });
      } catch (e) {
        return INITIAL_TASKS;
      }
    }
    return INITIAL_TASKS;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskDate, setCreateTaskDate] = useState<string>('');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'SAVING' | 'SAVED'>('SAVED');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    setSyncStatus('SAVING');
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      setSyncStatus('SAVED');
      setLastSyncTime(new Date());
    }, 500); // slight delay for visual feedback

    return () => clearTimeout(timer);
  }, [tasks]);

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSaveTask = (newTask: Task) => {
    setTasks([...tasks, newTask]);
    setIsCreateTaskModalOpen(false);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    setIsModalOpen(false);
  };

  const handleCreateRecurringTasks = (template: { title: string, dayOfMonth: number, notes: string }) => {
    const currentYear = new Date().getFullYear();
    const newTasks: Task[] = [];
    
    for (let month = 0; month < 12; month++) {
      let actualDay = template.dayOfMonth;
      const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
      if (actualDay > lastDayOfMonth) {
        actualDay = lastDayOfMonth;
      }
      const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
      
      newTasks.push({
        id: `recurring-${Date.now()}-${month}`,
        title: template.title,
        personnel: [],
        status: TaskStatus.NOT_STARTED,
        date: dateStr,
        notes: template.notes
      });
    }
    
    setTasks([...tasks, ...newTasks]);
    setIsRecurringModalOpen(false);
  };

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
                onCreateTask={(date: string) => {
                  setCreateTaskDate(date);
                  setIsCreateTaskModalOpen(true);
                }} 
                onDeleteTask={handleDeleteTask} 
                onTaskClick={handleTaskClick}
                onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
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
