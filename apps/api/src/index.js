// apps/api/src/index.js
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carga SIEMPRE apps/api/.env, sin depender del cwd
loadEnv({ path: join(__dirname, "../.env") });

import express from "express";

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

// 👇 Importa routes DESPUÉS de cargar .env
const routes = (await import("./routes.js")).default;
app.use(routes);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
