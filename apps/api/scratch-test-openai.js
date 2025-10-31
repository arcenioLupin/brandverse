// apps/api/scratch-test-openai.js (temporal)
import { getSentimentAdapter } from "./src/adapters/sentiment/index.js";

const adapter = getSentimentAdapter("openai");

const main = async () => {
  const res = await adapter.analyze(
    { text: "El servicio fue excelente, muchas gracias!", lang: "es" },
    { model: process.env.OPENAI_MODEL, temperature: 0 }
  );
  console.log(res);
};
main().catch(console.error);
