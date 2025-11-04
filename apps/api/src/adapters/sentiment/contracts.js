/**
 * @typedef {Object} SentimentInput
 * @property {string} text               Texto a analizar (requerido)
 * @property {string} [lang]             Idioma (ej. 'es', 'en')
 * @property {Object} [context]          Metadatos opcionales (fuente, canal, etc.)
 */

/**
 * @typedef {Object} SentimentOptions
 * @property {string} model              Identificador del modelo (ej. 'gpt-4.1-mini')
 * @property {number} [temperature]      0..1
 * @property {number} [seed]             Entero opcional para determinismo
 * @property {Object} [params]           Otros parámetros del proveedor
 */

/**
 * @typedef {Object} SentimentResult
 * @property {'pos'|'neu'|'neg'} label
 * @property {number} score              0..1 (confianza/valencia)
 * @property {number} [confidence]       0..1 (si el proveedor lo expone)
 * @property {Object} [raw]              Respuesta cruda del LLM
 * @property {string} modelVendor        (ej. 'openai' | 'gemini' | 'anthropic')
 * @property {string} modelId            (ej. 'gpt-4.1-mini')
 * @property {string} [modelVersion]     (si aplica)
 * @property {Object} [usedParams]       Parámetros efectivos usados
 */

/**
 * Interfaz mínima que deben implementar los adapters de sentimiento.
 * @interface
 */
export class SentimentAdapter {
  /**
   * @param {SentimentInput} input
   * @param {SentimentOptions} options
   * @returns {Promise<SentimentResult>}
   */
  async analyze(input, options) {
    throw new Error('Not implemented');
  }
}
