import { SentimentAdapter } from "./contracts.js";
import { llmConfig } from "../../config/llm.js";

/**
 * Adapter OpenAI para análisis de sentimiento.
 * Implementa SentimentAdapter.analyze(input, options)
 */
export class OpenAIAdapter extends SentimentAdapter {
  /**
   * @param {{text:string, lang?:string, context?:object}} input
   * @param {{model:string, temperature?:number, seed?:number, params?:object}} options
   * @returns {Promise<{
   *  label:'pos'|'neu'|'neg', score:number, confidence?:number, raw?:any,
   *  modelVendor:string, modelId:string, modelVersion?:string, usedParams?:object
   * }>}
   */
  async analyze(input, options = {}) {
    const { text, lang } = input || {};
    if (!text || typeof text !== "string") {
      throw new Error("OpenAIAdapter.analyze: `text` requerido");
    }

    // ---- Config efectiva (ENV + options) ----
    const apiKey = llmConfig.openai.apiKey;
    if (!apiKey) {
      // Modo mock si no hay API key: útil en dev/offline
      return this.#mockResult(text);
    }

    const model = options.model || llmConfig.openai.model;
    const temperature =
      typeof options.temperature === "number" ? options.temperature : llmConfig.openai.temperature;

    const usedParams = {
      model,
      temperature,
      ...(options.params || {}),
      ...(lang ? { lang } : {}),
    };

    // ---- Prompt minimal y claro (clasificación 3 clases + score 0..1) ----
    const system = "You are a strict sentiment classifier. Output ONLY JSON.";
    const user = [
      "Classify the sentiment of the following text into one of: pos, neu, neg.",
      "Return JSON with fields: label, score (0..1), and optional confidence (0..1).",
      lang ? `Language hint: ${lang}` : null,
      "",
      `Text: """${text}"""`,
    ]
      .filter(Boolean)
      .join("\n");

    // ---- Llamada HTTP directa (sin SDK) para mantener dependencia cero ----
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      response_format: { type: "json_object" },
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    // Parseo robusto del JSON devuelto
    let parsed = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const label = this.#coerceLabel(parsed.label);
    const score = this.#clamp01(Number(parsed.score));
    const confidence = parsed.confidence != null ? this.#clamp01(Number(parsed.confidence)) : undefined;

    return {
      label,
      score,
      ...(confidence != null ? { confidence } : {}),
      raw: data, // conserva respuesta completa para auditoría (se persistirá luego)
      modelVendor: "openai",
      modelId: model,
      usedParams,
    };
  }

  // --- Helpers privados ---

  #coerceLabel(l) {
    const s = String(l || "").toLowerCase();
    if (s.startsWith("pos")) return "pos";
    if (s.startsWith("neg")) return "neg";
    return "neu";
  }

  #clamp01(x) {
    if (!Number.isFinite(x)) return 0.5;
    return Math.max(0, Math.min(1, x));
  }

  // Modo mock para dev sin API key
  #mockResult(text) {
    const t = text.toLowerCase();
    const posHints = ["excelente", "bueno", "gracias", "love", "great", "awesome"];
    const negHints = ["malo", "terrible", "odio", "bad", "worst", "awful"];

    let label = "neu";
    if (posHints.some(h => t.includes(h))) label = "pos";
    if (negHints.some(h => t.includes(h))) label = "neg";

    const score = label === "pos" ? 0.9 : label === "neg" ? 0.1 : 0.5;

    return Promise.resolve({
      label,
      score,
      modelVendor: "openai",
      modelId: "(mock)",
      usedParams: { mock: true },
      raw: { mock: true },
    });
  }
}
