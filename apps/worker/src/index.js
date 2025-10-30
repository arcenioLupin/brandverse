// apps/worker/src/index.js
import bullmq from "bullmq";
const { Worker } = bullmq;

import { queueName, connection } from "./shared.js";
import { insertJobLog } from "./db.js";

// 1) Concurrencia por ENV (default 4)
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "4", 10);

const worker = new Worker(
  queueName,
  async (job) => {
    const attempt = (job.attemptsMade ?? 0) + 1;
    const started = Date.now();

    // (Opcional recomendado) Log de recepción por intento
    await insertJobLog({
      event: "got-job",
      jobId: String(job.id),
      payload: { name: job.name, attempt, data: job.data },
      status: "received",
      error: null,
      durationMs: null,
    });

    try {
      console.log(
        `[worker] got job name=${job.name} id=${job.id} attempt=${attempt} data=${JSON.stringify(job.data)}`
      );

      if (job.name === "ping") {
        // Forzar fallo de prueba de retries/backoff
        if (job.data?.forceFail === true) {
          throw new Error("forced-fail for testing retries");
        }

        // ... tu trabajo real/simulado aquí ...
        // await doWork();

        const dur = Date.now() - started;
        console.log("dur: ", dur);

        const log = await insertJobLog({
          event: "completed",
          jobId: String(job.id),
          payload: { name: job.name, attempt },
          status: "completed",
          error: null,
          durationMs: dur,
        });

        console.log(
          `[worker] completed id=${job.id} attempt=${attempt} duration=${dur}ms logId=${log.id} at=${log.created_at?.toISOString?.() ?? log.created_at}`
        );

        return { ok: true, at: new Date().toISOString(), attempt, durationMs: dur };
      }

      // Otros tipos de job en el futuro...
      const dur = Date.now() - started;
      console.log("dur: ", dur);

      await insertJobLog({
        event: "completed",
        jobId: String(job.id),
        payload: { name: job.name, attempt },
        status: "completed",
        error: null,
        durationMs: dur,
      });
      console.log(`[worker] completed id=${job.id} attempt=${attempt} duration=${dur}ms`);
      return { ok: true, attempt, durationMs: dur };
    } catch (err) {
      const dur = Date.now() - started;
      console.log("dur: ", dur);

      console.error("[worker] handler error:", err);
      await insertJobLog({
        event: "failed",
        jobId: String(job.id),
        payload: { name: job.name, attempt },
        status: "failed",
        error: String(err?.stack || err?.message || err),
        durationMs: dur,
      });

      // Necesario para que BullMQ marque failed y aplique retries/backoff
      throw err;
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

// 3) Observabilidad básica (eventos del Worker)
worker.on("completed", (job) => {
  console.log("[worker] evt:completed", job.id, "attemptsMade=", job.attemptsMade);
});

worker.on("failed", (job, err) => {
  console.error("[worker] evt:failed", job?.id, "attemptsMade=", job?.attemptsMade, err?.message);
});

console.log("[worker] started. concurrency=", CONCURRENCY, "Waiting for jobs...");

// 4) Graceful shutdown
async function shutdown(signal) {
  try {
    console.log(`[worker] ${signal} → closing...`);
    // Cierra el worker: espera que terminen los jobs activos y frena el consumo de nuevos.
    await worker.close();

    // Si tu objeto `connection` es un ioredis u otro cliente con quit/close, ciérralo:
    if (typeof connection?.quit === "function") {
      await connection.quit();
    } else if (typeof connection?.disconnect === "function") {
      connection.disconnect();
    }

    console.log("[worker] closed cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("[worker] error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
