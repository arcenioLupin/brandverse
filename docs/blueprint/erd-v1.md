# BrandVerse — ERD v1
_Fecha:_ 2025-10-22

## Entidades (resumen)
- tenants(id, name, plan, created_at)
- users(id, tenant_id, email[citext, unique], role, created_at)
- projects(id, tenant_id, name, status, created_at)
- brands(id, tenant_id, project_id, name, slug, created_at)
- sources(id, tenant_id, brand_id, type, config[jsonb], active, created_at)
- mentions(id, tenant_id, brand_id, source_id, external_id?, published_at, author, title, content, raw[jsonb], created_at)
- sentiments(id, tenant_id, mention_id, label, score, model, created_at)  _v1: 1–1_
- jobs(id, tenant_id, type, status, payload[jsonb], created_at)
- job_runs(id, job_id, started_at, ended_at, status, error)

## Índices y constraints
- users(email) unique
- brands(tenant_id, project_id, slug) unique
- sentiments(tenant_id, mention_id) unique  _(v1: 1–1)_
- idx_mentions_tenant_brand_date(tenant_id, brand_id, published_at)
- sources(tenant_id, brand_id, type) index
- Enumeraciones/checks: sources.type, jobs.{type,status}, sentiments.label

## Notas
- Multi-tenant en todas las tablas de negocio (tenant_id NOT NULL).
- sources.config y mentions.raw en JSONB.
- Futuro: sentiments 1–N (clave única incluye model).

