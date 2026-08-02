/**
 * scripts/list_models.ts
 *
 * Quick debug helper: prints every Gemini model currently available to
 * your API key, along with which ones support generateContent. Handy
 * whenever you hit a 404 "model not found" error — Google retires model
 * IDs frequently, so this tells you what's actually live right now.
 *
 * Run with:  npx tsx scripts/list_models.ts
 */

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing required environment variable: GEMINI_API_KEY");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function main() {
  console.log("Models available to this API key:\n");

  const pager = await ai.models.list();
  for await (const model of pager) {
    const supportsGenerateContent =
      model.supportedActions?.includes("generateContent") ?? false;
    console.log(
      `${supportsGenerateContent ? "✅" : "  "} ${model.name}` +
        (model.displayName ? `  (${model.displayName})` : "")
    );
  }

  console.log(
    "\n✅ = supports generateContent (usable for sentiment analysis in this pipeline)."
  );
}

main().catch((err) => {
  console.error("Failed to list models:", err);
  process.exit(1);
});
