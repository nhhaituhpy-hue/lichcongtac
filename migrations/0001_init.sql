-- Initial schema for lichcongtac
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  startTime TEXT,
  endTime TEXT,
  personnel TEXT, -- Stored as comma-separated or JSON string
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  equipmentId TEXT,
  notes TEXT,
  templateId TEXT
);
