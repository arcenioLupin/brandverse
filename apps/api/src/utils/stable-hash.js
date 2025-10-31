import { createHash } from 'node:crypto';

/**
 * Stringify determinista (ordena claves recursivamente).
 * @param {any} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(v => stableStringify(v)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * sha256 en hex
 * @param {string} s
 * @returns {string}
 */
export function sha256Hex(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Calcula reproducibility_hash a partir de componentes canónicos.
 * @param {Object} args
 * @param {string} args.textNorm           Texto normalizado
 * @param {string} args.modelVendor
 * @param {string} args.modelId
 * @param {string} [args.modelVersion]
 * @param {Object} [args.params]           Parámetros efectivos
 * @param {Object} [args.promptVars]       Variables de plantilla
 * @returns {string} hex sha256
 */
export function computeReproHash({ textNorm, modelVendor, modelId, modelVersion, params, promptVars }) {
  const base = {
    textNorm,
    modelVendor,
    modelId,
    modelVersion: modelVersion || null,
    params: params || {},
    promptVars: promptVars || {}
  };
  return sha256Hex(stableStringify(base));
}
