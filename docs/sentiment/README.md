# BrandVerse — Sentiment (LLM Adapters + Persistencia)

Este módulo permite ejecutar **análisis de sentimiento** con un **adapter LLM** (OpenAI) y
**persistir resultados** de forma **idempotente y auditable**.

## Objetivos clave
- **Interfaces claras**: `SentimentAdapter` (`analyze(input, options)`).
- **Persistencia auditable**: tabla `sentiment_results`.
- **Idempotencia**: `reproducibility_hash` evita duplicados.
- **Reproducibilidad**: hash basado en texto normalizado + modelo + params + variables.

---

## Arquitectura (resumen)
- **Adapter**: `apps/api/src/adapters/sentiment/openai-adapter.js`
- **Contratos**: `apps/api/src/adapters/sentiment/contracts.js`
- **Servicio**: `apps/api/src/services/sentiment/analyze-and-persist.js`
- **Utils**: `text-normalize.js`, `stable-hash.js`
- **DB**: `infra/db/migrations/0003_sentiment_results.sql`
- **API**:
  - `POST /api/sentiment/analyze`
  - `GET /api/sentiment/:id`

---

## Variables de entorno
Archivo: `apps/api/.env`
