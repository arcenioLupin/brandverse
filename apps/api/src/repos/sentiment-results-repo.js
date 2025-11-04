import { pool } from "../db/pool.js";

export async function insertOrSelectByHash(row) {
  const client = await pool.connect();
  try {
    const insertSql = `
      INSERT INTO sentiment_results (
        source, text_hash, text_len, lang,
        model_vendor, model_id, model_version, params_json,
        prompt_template_id, prompt_vars_json, request_id,
        llm_response_json, label, score, confidence,
        reproducibility_hash
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,$15,
        $16
      )
      ON CONFLICT (reproducibility_hash) DO NOTHING
      RETURNING id, created_at
    `;
    const vals = [
      row.source, row.text_hash, row.text_len, row.lang,
      row.model_vendor, row.model_id, row.model_version, row.params_json,
      row.prompt_template_id, row.prompt_vars_json, row.request_id,
      row.llm_response_json, row.label, row.score, row.confidence,
      row.reproducibility_hash,
    ];
    const ins = await client.query(insertSql, vals);
    if (ins.rows.length > 0) return { id: ins.rows[0].id, created_at: ins.rows[0].created_at, created: true };

    const sel = await client.query(
      `SELECT id, created_at FROM sentiment_results WHERE reproducibility_hash = $1 LIMIT 1`,
      [row.reproducibility_hash]
    );
    if (sel.rows.length === 0) throw new Error("Hash not found after conflict");
    return { id: Number(sel.rows[0].id), created_at: sel.rows[0].created_at, created: false };
  } finally {
    client.release();
  }
}
