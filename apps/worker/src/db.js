import { config as loadEnv } from "dotenv";
loadEnv(); // leerá apps/worker/.env por defecto

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function insertJobLog({ event, payload = {}, status = "done", error = null }) {
  const sql = `
    insert into job_logs(event, payload, status, error)
    values ($1, $2::jsonb, $3, $4)
    returning id, created_at
  `;
  const values = [event, JSON.stringify(payload), status, error];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
