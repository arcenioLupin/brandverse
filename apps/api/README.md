## Queues & Jobs

**Stack**
- Redis (backend de cola)
- BullMQ (Queue/Worker)
- Postgres (logs en `job_logs`)

**Responsabilidades**
- **API**: encola jobs.
- **Worker**: procesa jobs (retries/backoff, concurrencia, shutdown limpio), inserta logs (`got-job`, `completed`, `failed`) con `job_id` y `duration_ms`.

### Endpoints
- `POST /api/jobs/ping`
  - Encola un job `ping`.
  - Opciones: `attempts=3`, `backoff: exponential(2000ms)`, `removeOnComplete`/`removeOnFail`.
  - Ejemplo body:
    ```json
    { "kind": "ping", "meta": { "source": "api" } }
    ```

- `GET /api/jobs/health`
  - Entrega contadores: `waiting`, `active`, `completed`, `failed`, `delayed`, `waitingChildren`.
  - Respuesta:
    ```json
    {
      "queue": "brandverse:jobs",
      "counts": { "waiting": 0, "active": 0, "completed": 10, "failed": 0, "delayed": 0, "waitingChildren": 0 },
      "ts": "2025-10-30T00:00:00.000Z"
    }
    ```

### Variables de entorno relevantes
```env
# API (enqueue)
QUEUE_ATTEMPTS=3
QUEUE_BACKOFF_BASE_MS=2000
JOB_REMOVE_COMPLETE_AGE=3600
JOB_REMOVE_COMPLETE_COUNT=1000
JOB_REMOVE_FAIL_AGE=86400
JOB_REMOVE_FAIL_COUNT=500

# Worker
WORKER_CONCURRENCY=4

