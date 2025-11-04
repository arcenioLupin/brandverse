import { getSentimentAdapter } from "../../adapters/sentiment/index.js";
import { buildPersistable } from "./prepersist.js";
import { pool } from "../../db/pool.js";
import { insertOrSelectByHash } from "../../repos/sentiment-results-repo.js";

/**
 * Ejecuta análisis de sentimiento y lo persiste de forma idempotente.
 * @param {Object} args
 * @param {string} args.text                        // texto a analizar
 * @param {string} [args.lang]                      // 'es' | 'en' ...
 * @param {'openai'} [args.vendor='openai']         // proveedor
 * @param {Object} [args.options]                   // model, temperature, params...
 * @param {Object} [args.meta]                      // { source, requestId, promptTemplateId, promptVars }
 * @returns {Promise<{ id:number, created:boolean, result:any, record:any }>}
 */
export async function analyzeAndPersist({ text, lang, vendor = "openai", options = {}, meta = {} }) {
  if (!text || typeof text !== "string") {
    throw new Error("analyzeAndPersist: `text` requerido");
  }

  // 1) Adapter → SentimentResult
  const adapter = getSentimentAdapter(vendor);
  const result = await adapter.analyze({ text, lang, context: meta?.context }, options);

  // 2) Transform a payload listo para persistir en sentiment_results
  const row = buildPersistable({ text, lang, result }, meta);
  // row contiene: source, text_hash, text_len, lang, model_vendor, model_id, model_version,
  //               params_json, prompt_template_id, prompt_vars_json, request_id,
  //               llm_response_json, label, score, confidence, reproducibility_hash

  // 3) Persistencia idempotente por reproducibility_hash
  const repoRes = await insertOrSelectByHash(row);
  return { ...repoRes, result }; // { id, created, created_at, result }

}
