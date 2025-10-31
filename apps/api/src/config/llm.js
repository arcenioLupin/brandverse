export const llmConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0),
  },
};
