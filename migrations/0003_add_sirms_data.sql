-- Create table for SIRMS history data
CREATE TABLE IF NOT EXISTS sirms_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- DVOR
  dvor_tx TEXT,
  dvor_azi REAL,
  dvor_m30 REAL,
  dvor_m99 REAL,
  dvor_dev REAL,
  dvor_rf REAL,
  
  -- DME
  dme_tx TEXT,
  dme_delay REAL,
  dme_spacing REAL,
  dme_pwr REAL,
  dme_erp REAL,
  dme_eff REAL
);

-- Index for fast time-range queries
CREATE INDEX IF NOT EXISTS idx_sirms_timestamp ON sirms_data(timestamp);
