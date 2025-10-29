import { config as loadEnv } from "dotenv";
loadEnv(); // leerá apps/api/.env por defecto
import express from "express";
import routes from "./routes.js";

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
