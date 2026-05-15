-- Migration: Add push notification support
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_json TEXT NOT NULL,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS navaid_limits (
    param_name TEXT PRIMARY KEY,
    min_val REAL,
    max_val REAL,
    enabled BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    param_name TEXT NOT NULL,
    last_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
