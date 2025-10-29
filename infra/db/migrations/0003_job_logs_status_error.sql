ALTER TABLE job_logs
  ADD COLUMN status text NOT NULL DEFAULT 'done',
  ADD COLUMN error  text;

-- opcional: index por tipo/fecha
-- CREATE INDEX IF NOT EXISTS idx_job_logs_type_created_at
--   ON job_logs(type, created_at DESC);
