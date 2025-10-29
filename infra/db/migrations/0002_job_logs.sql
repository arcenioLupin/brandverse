-- 0002_job_logs.sql
create table if not exists job_logs (
  id uuid primary key default uuid_generate_v4(),
  event text not null,           -- 'ping' u otros
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'done',   -- 'done' | 'failed'
  error text,                    -- stack o mensaje si falla
  created_at timestamptz not null default now()
);
create index if not exists idx_job_logs_created_at on job_logs(created_at desc);
