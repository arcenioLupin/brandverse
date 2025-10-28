// apps/worker/src/index.js
import Bull from "bullmq";
import IORedis from "ioredis";

const { Queue, Worker, QueueEvents } = Bull;

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// 👇 OJO: BullMQ v5 pide maxRetriesPerRequest: null
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  // opcional pero útil en dev si usas contenedores que tardan en responder:
  // enableReadyCheck: false,
});

const queueName = "heartbeat";

const queue = new Queue(queueName, { connection });

// Encola un job repetible cada 60s
await queue.add(
  "tick",
  { at: new Date().toISOString() },
  { repeat: { every: 60_000 } }
);

// Worker que procesa los jobs
const worker = new Worker(
  queueName,
  async (job) => {
    console.log(`[worker] heartbeat: ${job.name} id=${job.id} at=${new Date().toISOString()}`);
  },
  { connection }
);

// Eventos (opcional, para logging)
const events = new QueueEvents(queueName, { connection });
events.on("completed", ({ jobId }) => console.log(`[worker] completed ${jobId}`));
events.on("failed", ({ jobId, failedReason }) => console.error(`[worker] failed ${jobId}: ${failedReason}`));

worker.on("error", (err) => console.error("[worker] error", err));

console.log("[worker] started. Waiting for heartbeats...");
