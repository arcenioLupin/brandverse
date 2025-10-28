import express from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const app = express();
const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.get("/version", (_req, res) => {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    res.json({ name: pkg.name, version: pkg.version || "0.0.0" });
  } catch {
    res.json({ name: "@brandverse/api", version: "0.0.0" });
  }
});

app.listen(PORT, () =>
  console.log(`[api] listening on http://localhost:${PORT}`)
);
