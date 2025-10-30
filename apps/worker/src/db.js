import { config as loadEnv } from "dotenv";
loadEnv(); // leerá apps/worker/.env por defecto

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function insertJobLog({ event,jobId =null, payload = {}, status = "done", error = null, durationMs=null }) {
  const sql = `
    insert into job_logs(event,job_id, payload, status, error,duration_ms)
    values ($1, $2, $3::jsonb, $4, $5, $6)
    returning id, created_at
  `;
  const values = [event, jobId, JSON.stringify(payload), status, error, durationMs];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
