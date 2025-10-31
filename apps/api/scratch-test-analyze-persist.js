import { analyzeAndPersist } from "./src/services/sentiment/analyze-and-persist.js";

const main = async () => {
  const res1 = await analyzeAndPersist({
    text: "El servicio fue excelente y llegó a tiempo.",
    lang: "es",
    vendor: "openai",
    options: { model: process.env.OPENAI_MODEL || "gpt-4.1-mini", temperature: 0 },
    meta: { source: "manual-test", requestId: "abc-123", promptVars: { domain: "delivery" } },
  });
  console.log("First:", res1);

  // Segundo llamado idéntico → debe devolver created=false (idempotente)
  const res2 = await analyzeAndPersist({
    text: "El servicio fue excelente y llegó a tiempo.",
    lang: "es",
    vendor: "openai",
    options: { model: process.env.OPENAI_MODEL || "gpt-4.1-mini", temperature: 0 },
    meta: { source: "manual-test", requestId: "abc-123", promptVars: { domain: "delivery" } },
  });
  console.log("Second:", res2);
};

main().catch(console.error);
