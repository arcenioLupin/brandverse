import { Router } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { queue } from "./queue.js";

const router = Router();

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



export default router;
