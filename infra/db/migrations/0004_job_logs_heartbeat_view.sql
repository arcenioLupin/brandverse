-- Índices útiles sobre JSONB y tiempos
CREATE INDEX IF NOT EXISTS idx_job_logs_payload_name
  ON job_logs ((payload->>'name'));
CREATE INDEX IF NOT EXISTS idx_job_logs_hb_service
  ON job_logs ((payload->'heartbeat'->>'service'));
CREATE INDEX IF NOT EXISTS idx_job_logs_hb_hostname
  ON job_logs ((payload->'heartbeat'->>'hostname'));
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at
  ON job_logs (created_at);

-- Vista: normaliza service/hostname a partir del payload final de heartbeat
CREATE OR REPLACE VIEW vw_heartbeat_events AS
SELECT
  job_id,
  status,
  created_at,
  COALESCE(NULLIF(payload->'heartbeat'->>'service',''), 'unknown')   AS service,
  COALESCE(NULLIF(payload->'heartbeat'->>'hostname',''), 'unknown')  AS hostname
FROM job_logs
WHERE payload->>'name' = 'heartbeat';
