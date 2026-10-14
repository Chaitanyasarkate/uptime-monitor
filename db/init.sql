-- PostgreSQL 16 schema initialization for Uptime Monitor

CREATE TABLE IF NOT EXISTS monitors (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  status VARCHAR(10) DEFAULT 'PENDING',
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ping_logs (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up BOOLEAN,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ping_logs_monitor_time ON ping_logs(monitor_id, checked_at DESC);
