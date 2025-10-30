-- columnas opcionales, por si aún no existen
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS job_id text;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS duration_ms integer;

-- created_at si lo manejas por DB
ALTER TABLE job_logs
  ALTER COLUMN created_at SET DEFAULT NOW();

-- índices mínimos
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id       ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_status       ON job_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at   ON job_logs(created_at);
