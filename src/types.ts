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

export type ViewType = 'DASHBOARD';
