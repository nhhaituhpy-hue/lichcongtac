export enum TaskStatus {
  DONE = 'DONE',
  NOT_STARTED = 'NOT_STARTED',
  CANCELLED = 'CANCELLED'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  personnel: string[];
  status: TaskStatus;
  date: string; // ISO format
  equipmentId?: string;
  notes?: string;
  templateId?: string;
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface RecurringRule {
  id: string;
  taskContent: string;
  frequency: Frequency;
  specificDay: string;
  performer: string;
}

export interface ShiftSchedule {
  id: string;
  month: string; // Format: YYYY-MM
  personName: string;
  date: number; // 1-31
  shiftType: string; // X, D, X1, X2, CN, T, T2, etc.
}

export type ViewType = 'DASHBOARD';
