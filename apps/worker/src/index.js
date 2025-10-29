import bullmq from "bullmq";
const { Worker } = bullmq;

import { queueName, connection } from "./shared.js";
import { insertJobLog } from "./db.js";

const worker = new Worker(
  queueName,
  async (job) => {
    try {
      console.log(`[worker] got job name=${job.name} id=${job.id} data=${JSON.stringify(job.data)}`);

      if (job.name === "ping") {
        const log = await insertJobLog({
          event: "ping",
          payload: job.data ?? {},
          status: "done",
          error: null,
        });
        console.log(`[worker] insert ok id=${log.id} at=${log.created_at.toISOString?.() ?? log.created_at}`);
        return { ok: true, at: new Date().toISOString() };
      }

      // Otros tipos de job en el futuro...
      return { ok: true };
    } catch (err) {
      console.error("[worker] handler error:", err);
      // Guardamos el error también en job_logs
      await insertJobLog({
        event: job.name ?? "unknown",
        payload: job.data ?? {},
        status: "failed",
        error: String(err?.stack || err?.message || err),
      });
      throw err;
    }
  },
  { connection }
);

worker.on("completed", (job) => console.log("[worker] completed", job.id));
worker.on("failed", (job, err) => console.error("[worker] failed", job?.id, err));

console.log("[worker] started. Waiting for jobs...");
