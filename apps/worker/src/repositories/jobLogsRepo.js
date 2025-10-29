// apps/worker/src/repositories/jobLogsRepo.js
/**
 * Inserta un registro en job_logs
 * @param {import('pg').Pool} db
 */
export async function insertJobLog(db, {
  type,
  payload = {},
  status = "done",
  error = null,
}) {
  const sql = `
    INSERT INTO job_logs(type, payload, status, error)
    VALUES ($1, $2::jsonb, $3, $4)
    RETURNING id, created_at
  `;
  const values = [type, JSON.stringify(payload), status, error];
  const { rows } = await db.query(sql, values);
  return rows[0];
}

// Azúcar para pings de salud
export async function insertPing(db, { now }) {
  return insertJobLog(db, { type: "ping", payload: { now }, status: "done" });
}
