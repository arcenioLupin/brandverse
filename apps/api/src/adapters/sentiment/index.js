import { OpenAIAdapter } from "./openai-adapter.js";

/**
 * Devuelve un adapter por vendor.
 * @param {'openai'} vendor
 */
export function getSentimentAdapter(vendor = "openai") {
  switch (vendor) {
    case "openai":
    default:
      return new OpenAIAdapter();
  }
}
