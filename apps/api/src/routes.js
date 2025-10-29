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
router.post("/api/jobs/ping", async (_req, res) => {
  try {
    const job = await queue.add("ping", { source: "api", at: new Date().toISOString() }, { removeOnComplete: true }); // Escribe el job en Redis en la cola BullMQ
    res.status(202).json({ queued: true, jobId: job.id });
  } catch (err) {
    console.error("[api] enqueue ping error:", err);
    res.status(500).json({ error: "enqueue_failed" });
  }
});

export default router;
