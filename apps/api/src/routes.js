import { Router } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { queue } from "./queue.js";
import pg from "pg";

const router = Router();
const { Pool } = pg;

// Usa tu cadena/vars actuales; fallback local para dev
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL
});

// GET /api/metrics/heartbeat?minutes=60
router.get("/api/metrics/heartbeat", async (req, res) => {
  try {
    const minutes = Math.max(1, parseInt(req.query.minutes ?? "60", 10)); // ventana mínima 1 min
    const q = `
      WITH base AS (
        SELECT
          COALESCE(
            NULLIF(payload->'heartbeat'->>'service', ''),
            NULLIF(payload->'data'->>'service', ''),
            'unknown'
          ) AS service,
          status,
          created_at
        FROM job_logs
        WHERE payload->>'name' = 'heartbeat'
          AND created_at >= NOW() - ($1::int || ' minutes')::interval
      )
      SELECT
        service,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
        MIN(created_at) AS first_at,
        MAX(created_at) AS last_at
      FROM base
      GROUP BY service
      ORDER BY completed DESC NULLS LAST, failed DESC NULLS LAST;
    `;

    const { rows } = await pool.query(q, [minutes]);
    res.json({
      window: { minutes },
      rows,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api] /api/metrics/heartbeat error:", err);
    res.status(500).json({ error: "metrics_failed" });
  }
});

// GET /api/metrics/heartbeat/hosts?minutes=60&service=api&top=5
router.get("/api/metrics/heartbeat/hosts", async (req, res) => {
  try {
    const minutes = Math.max(1, parseInt(req.query.minutes ?? "60", 10));
    const service = (req.query.service ?? "").toString().trim(); // opcional
    const top = Math.max(1, parseInt(req.query.top ?? "10", 10));

    // Usa la vista si existe; si aún no la creaste, reemplaza vw_heartbeat_events por el subselect del Paso 3
    const q = `
      WITH base AS (
        SELECT service, hostname, status, created_at
        FROM vw_heartbeat_events
        WHERE created_at >= NOW() - ($1::int || ' minutes')::interval
          AND ($2 = '' OR service = $2)
          AND service <> 'unknown'
          AND hostname <> 'unknown'
      ),
      agg AS (
        SELECT
          service,
          hostname,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'failed')::int    AS failed,
          MIN(created_at) AS first_at,
          MAX(created_at) AS last_at
        FROM base
        GROUP BY service, hostname
      )
      SELECT *
      FROM agg
      ORDER BY completed DESC, failed DESC, last_at DESC
      LIMIT $3
    `;
    const { rows } = await pool.query(q, [minutes, service, top]);
    res.json({
      window: { minutes },
      filter: { service: service || null, top },
      rows,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api] /api/metrics/heartbeat/hosts error:", err);
    res.status(500).json({ error: "metrics_failed" });
  }
});


router.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

router.get("/version", (_req, res) => {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    res.json({ name: pkg.name, version: pkg.version || "0.0.0" });
  } catch {
    res.json({ name: "@brandverse/api", version: "0.0.0" });
  }
});

  // Validación mínima sin librerías
  function validateHeartbeat(body) {
    const errors = [];

    const service = typeof body?.service === "string" && body.service.trim().length > 0
      ? body.service.trim()
      : null;
    if (!service) errors.push("service: string requerido");

    const hostname = typeof body?.hostname === "string" && body.hostname.trim().length > 0
      ? body.hostname.trim()
      : null;
    if (!hostname) errors.push("hostname: string requerido");

    // ts: acepta ISO string o epoch ms (number)
    let ts = body?.ts;
    if (typeof ts === "number") {
      if (!Number.isFinite(ts) || ts <= 0) errors.push("ts: number epoch inválido");
    } else if (typeof ts === "string") {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) errors.push("ts: ISO inválido");
    } else if (ts == null) {
      ts = new Date().toISOString(); // default
    } else {
      errors.push("ts: debe ser string ISO o number (epoch)");
    }

    return { ok: errors.length === 0, errors, value: { service, hostname, ts, meta: body?.meta ?? {} } };
  }

// 👉 Encola heartbeats con retries/backoff/cleanup igual que ping
router.post("/api/jobs/heartbeat", async (req, res) => {
  try {
    const { ok, errors, value } = validateHeartbeat(req.body || {});
    if (!ok) return res.status(400).json({ error: "validation_failed", details: errors });

    const attempts = parseInt(process.env.QUEUE_ATTEMPTS ?? "3", 10);
    const backoffBase = parseInt(process.env.QUEUE_BACKOFF_BASE_MS ?? "2000", 10);
    const rmOkAge = parseInt(process.env.JOB_REMOVE_COMPLETE_AGE ?? "3600", 10);
    const rmOkCount = parseInt(process.env.JOB_REMOVE_COMPLETE_COUNT ?? "1000", 10);
    const rmFailAge = parseInt(process.env.JOB_REMOVE_FAIL_AGE ?? "86400", 10);
    const rmFailCount = parseInt(process.env.JOB_REMOVE_FAIL_COUNT ?? "500", 10);

    const job = await queue.add("heartbeat", value, {
      attempts,
      backoff: { type: "exponential", delay: backoffBase },
      removeOnComplete: { age: rmOkAge, count: rmOkCount },
      removeOnFail: { age: rmFailAge, count: rmFailCount },
    });

    res.status(202).json({ queued: true, jobId: job.id });
  } catch (err) {
    console.error("[api] enqueue heartbeat error:", err);
    res.status(500).json({ error: "enqueue_failed" });
  }
});


// 👉 Solo encola. Nada de DB aquí.
router.post("/api/jobs/ping", async (req, res) => {
  try {
    // Permite payload externo si tienes app.use(express.json()) habilitado;
    // si no, usa un payload mínimo por defecto:
    const payload =
      req?.body && Object.keys(req.body).length
        ? req.body
        : { source: "api", at: new Date().toISOString(), kind: "ping" };


    // Lee opciones desde ENV con defaults seguros
    const attempts = parseInt(process.env.QUEUE_ATTEMPTS ?? "3", 10);
    const backoffBase = parseInt(process.env.QUEUE_BACKOFF_BASE_MS ?? "2000", 10);
    const rmOkAge = parseInt(process.env.JOB_REMOVE_COMPLETE_AGE ?? "3600", 10);      // 1h
    const rmOkCount = parseInt(process.env.JOB_REMOVE_COMPLETE_COUNT ?? "1000", 10); // o 1000 jobs
    const rmFailAge = parseInt(process.env.JOB_REMOVE_FAIL_AGE ?? "86400", 10);      // 24h
    const rmFailCount = parseInt(process.env.JOB_REMOVE_FAIL_COUNT ?? "500", 10);    // o 500 jobs

    const job = await queue.add("ping", payload, {
      attempts,
      backoff: { type: "exponential", delay: backoffBase },
      removeOnComplete: { age: rmOkAge, count: rmOkCount },
      removeOnFail: { age: rmFailAge, count: rmFailCount },
    });

    res.status(202).json({ queued: true, jobId: job.id });
  } catch (err) {
    console.error("[api] enqueue ping error:", err);
    res.status(500).json({ error: "enqueue_failed" });
  }
});

// Salud de la cola BullMQ
router.get("/api/jobs/health", async (_req, res) => {
  try {
    // Usamos la misma instancia 'queue' que ya importas de "./queue.js"
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      waitingChildren
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getWaitingChildrenCount(),
    ]);

    res.json({
      queue: queue.name,           // nombre real de la cola
      counts: { waiting, active, completed, failed, delayed, waitingChildren },
      ts: new Date().toISOString() // marca de tiempo
    });
  } catch (err) {
    console.error("[api] /api/jobs/health error:", err);
    res.status(500).json({ error: "health_failed" });
  }
});

// --- Sentiment: analyze (idempotente) ---
import { analyzeAndPersist } from "./services/sentiment/analyze-and-persist.js";
// Validación mínima del body
function validateAnalyzeBody(b) {
  const errors = [];
  const text = typeof b?.text === "string" && b.text.trim().length > 0 ? b.text : null;
  if (!text) errors.push("text: string requerido");

  const lang = typeof b?.lang === "string" && b.lang.trim().length > 0 ? b.lang.trim() : null;

  // vendor limitado (por ahora)
  const vendor = (b?.vendor || "openai").toString().trim().toLowerCase();
  if (!["openai"].includes(vendor)) errors.push("vendor: 'openai' soportado por ahora");

  const options = b?.options && typeof b.options === "object" ? b.options : {};
  const meta = b?.meta && typeof b.meta === "object" ? b.meta : {};

  return { ok: errors.length === 0, errors, value: { text, lang, vendor, options, meta } };
}

// POST /api/sentiment/analyze
router.post("/api/sentiment/analyze", async (req, res) => {
  try {
    const { ok, errors, value } = validateAnalyzeBody(req.body || {});
    if (!ok) return res.status(400).json({ error: "validation_failed", details: errors });

    const out = await analyzeAndPersist(value);
    // out: { id, created, created_at?, result? } según tu implementación
    return res.status(out?.created ? 201 : 200).json({
      id: Number(out.id),
      created: !!out.created,
      createdAt: out.created_at ?? null,
      result: out.result ?? null,
    });
  } catch (err) {
    console.error("[api] /api/sentiment/analyze error:", err);
    return res.status(500).json({ error: "analyze_failed" });
  }
});

// GET /api/sentiment/:id
router.get("/api/sentiment/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const q = `
      SELECT
        id::bigint AS id, source, text_hash, text_len, lang,
        model_vendor, model_id, model_version,
        params_json, prompt_template_id, prompt_vars_json, request_id,
        llm_response_json, label, score, confidence,
        reproducibility_hash, created_at
      FROM sentiment_results
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });

    // Sugerencia: ocultar text_hash si luego expones el texto original por otro canal
    //return res.json(rows[0]);
    return res.json({
      ...rows[0],
      id: Number(rows[0].id),
      text_len: Number(rows[0].text_len),
      score: Number(rows[0].score),
      confidence: rows[0].confidence != null ? Number(rows[0].confidence) : null,
    });

  } catch (err) {
    console.error("[api] /api/sentiment/:id error:", err);
    return res.status(500).json({ error: "read_failed" });
  }
});




export default router;
