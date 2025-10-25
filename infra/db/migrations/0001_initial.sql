create extension if not exists "uuid-ossp";
create extension if not exists citext;

-- tenants
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text,
  created_at timestamptz not null default now()
);

-- users
create table users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  email citext not null unique,
  role text not null,
  created_at timestamptz not null default now()
);

-- projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- brands
create table brands (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, project_id, slug)
);

-- sources
create table sources (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  brand_id uuid not null references brands(id),
  type text not null,
  config jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_sources_tenant_brand_type on sources(tenant_id, brand_id, type);

-- mentions
create table mentions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  brand_id uuid not null references brands(id),
  source_id uuid not null references sources(id),
  external_id text, -- unique when present
  published_at timestamptz not null,
  author text,
  title text,
  content text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index idx_mentions_tenant_brand_date on mentions(tenant_id, brand_id, published_at);
-- Optional dedup per provider when external_id is present:
-- create unique index uniq_mentions_external_id on mentions(external_id) where external_id is not null;

-- sentiments (v1: 1–1)
create table sentiments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  mention_id uuid not null references mentions(id) on delete cascade,
  label text not null, -- pos|neu|neg
  score numeric(4,3) not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, mention_id)
);

-- jobs / job_runs
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  type text not null,   -- ingest|enrich|score
  status text not null, -- pending|running|done|failed
  payload jsonb,
  created_at timestamptz not null default now()
);

create table job_runs (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  status text,
  error text
);
