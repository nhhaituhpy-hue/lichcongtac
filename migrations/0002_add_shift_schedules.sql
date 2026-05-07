-- Add shift schedules table
CREATE TABLE IF NOT EXISTS shift_schedules (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  person_name TEXT NOT NULL,
  date INTEGER NOT NULL,
  shift_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, person_name, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shift_schedules_month ON shift_schedules(month);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date ON shift_schedules(date);
