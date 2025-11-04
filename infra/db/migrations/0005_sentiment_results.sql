-- Tabla de resultados de sentimiento (auditable y reproducible)
CREATE TABLE IF NOT EXISTS sentiment_results (
  id BIGSERIAL PRIMARY KEY,
  source               VARCHAR(80),         -- origen del texto (app, canal, etc.)
  text_hash            CHAR(64) NOT NULL,   -- sha256 del texto normalizado
  text_len             INTEGER NOT NULL,    -- longitud del texto normalizado
  lang                 VARCHAR(8),
  model_vendor         VARCHAR(32) NOT NULL, -- 'openai' | 'gemini' | ...
  model_id             VARCHAR(64) NOT NULL, -- 'gpt-4.1-mini', etc.
  model_version        VARCHAR(64),          -- opcional
  params_json          JSONB,                -- parámetros efectivos del modelo
  prompt_template_id   VARCHAR(64),          -- si usas plantillas
  prompt_vars_json     JSONB,                -- variables de la plantilla
  request_id           VARCHAR(64),          -- id externo opcional
  llm_response_json    JSONB,                -- respuesta cruda del LLM
  label                VARCHAR(8) NOT NULL,  -- 'pos'|'neu'|'neg'
  score                NUMERIC(5,4) NOT NULL, -- 0..1
  confidence           NUMERIC(5,4),         -- 0..1 (si aplica)
  reproducibility_hash CHAR(64) NOT NULL,    -- sha256(text_norm+modelo+params+vars)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sentiment_results_created_at
  ON sentiment_results (created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_text_hash
  ON sentiment_results (text_hash);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_model
  ON sentiment_results (model_vendor, model_id);
-- Unicidad por reproducibilidad (idempotencia lógica)
CREATE UNIQUE INDEX IF NOT EXISTS ux_sentiment_results_repro_hash
  ON sentiment_results (reproducibility_hash);
