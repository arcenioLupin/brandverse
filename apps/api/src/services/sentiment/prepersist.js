import { normalizeText } from '../../utils/text-normalize.js';
import { sha256Hex, computeReproHash, stableStringify } from '../../utils/stable-hash.js';

/**
 * Prepara el payload para guardar en sentiment_results (sin hacer INSERT).
 * @param {Object} args
 * @param {string} args.text
 * @param {string} [args.lang]
 * @param {import('../../adapters/sentiment/contracts.js').SentimentResult} result
 * @param {Object} [meta]                  { source, requestId, promptTemplateId, promptVars }
 */
export function buildPersistable({ text, lang, result }, meta = {}) {
  const textNorm = normalizeText(text);
  const textHash = sha256Hex(textNorm);
  const textLen  = textNorm.length;

  const reproducibilityHash = computeReproHash({
    textNorm,
    modelVendor: result.modelVendor,
    modelId: result.modelId,
    modelVersion: result.modelVersion,
    params: result.usedParams || {},
    promptVars: meta.promptVars || {}
  });

  return {
    source: meta.source || null,
    text_hash: textHash,
    text_len: textLen,
    lang: lang || null,
    model_vendor: result.modelVendor,
    model_id: result.modelId,
    model_version: result.modelVersion || null,
    params_json: result.usedParams || {},
    prompt_template_id: meta.promptTemplateId || null,
    prompt_vars_json: meta.promptVars || {},
    request_id: meta.requestId || null,
    llm_response_json: result.raw || {},
    label: result.label,
    score: Number(result.score),
    confidence: result.confidence != null ? Number(result.confidence) : null,
    reproducibility_hash: reproducibilityHash
  };
}
