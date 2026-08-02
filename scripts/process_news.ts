/**
 * scripts/process_news.ts
 *
 * Stracker — News Processing Pipeline (Gemini + Mock Embeddings edition)
 * ------------------------------------------------------------------------
 * 1. Reads raw articles from `stracker_news.json`.
 * 2. Drops anything tagged GENERAL_NOISE.
 * 3. For each remaining article (STOCK_NEWS / MACRO_POLITICAL):
 *      - Calls Gemini to get { sentiment, ai_impact_summary }.
 *      - Sets is_systemic = true for MACRO_POLITICAL, false otherwise.
 *      - Generates a DETERMINISTIC MOCK 1536-dim vector for
 *        `title + " " + content` — no embedding API call, no cost.
 * 4. Upserts the fully-processed records into the Supabase `articles` table.
 *
 * Why Gemini + mock embeddings?
 * This variant avoids OpenAI entirely so you can run the full pipeline
 * for free (Gemini's free tier) without hitting OpenAI quota errors.
 * The mock embeddings are hash-seeded, so identical text always produces
 * the identical vector — good enough to exercise the DB schema, upsert
 * logic, and pgvector column end-to-end, but they carry NO real semantic
 * meaning. Swap in a real embedding model before relying on
 * `match_articles` for genuine semantic search quality.
 *
 * A note on the model name:
 * Google retires Gemini model IDs frequently (gemini-1.5-*, and now even
 * gemini-2.0-* / gemini-2.5-* are being sunset on a rolling basis), and
 * free-tier rate limits vary a lot by model. Regular "Flash" models
 * (e.g. gemini-3.6-flash, behind the gemini-flash-latest alias) have
 * been observed as low as 5 requests/minute on some free-tier projects.
 * "Flash-Lite" models get a meaningfully higher free-tier RPM allowance
 * (typically 15-30), so this script defaults to gemini-flash-lite-latest.
 * Override with the GEMINI_MODEL env var if you want a different model —
 * see `scripts/list_models.ts` to check what's actually available on
 * your key.
 *
 * Run with:  npm run process-news
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------

const INPUT_FILE = path.resolve(process.cwd(), "stracker_news.json");

// Auto-updating alias, pointed at the Flash-Lite line for a higher
// free-tier RPM ceiling than regular Flash. Override with GEMINI_MODEL
// in .env if you want to pin to a specific dated model instead.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

const EMBEDDING_DIMENSIONS = 1536;

// How many articles to process concurrently. Gemini's free tier has a
// fairly low requests-per-minute limit, so keep this conservative.
const CONCURRENCY = Number(process.env.CONCURRENCY || 1);

// Optional: cap how many (post-filter) articles to process, for quick
// smoke tests. Leave unset / 0 to process everything.
// e.g. ARTICLE_LIMIT=5 npm run process-news
const ARTICLE_LIMIT = Number(process.env.ARTICLE_LIMIT || 0);

// Simple retry settings for transient API failures (also covers
// free-tier 429 rate limit responses).
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 5);
const RETRY_BASE_DELAY_MS = 2000;

// Extra fixed pause between individual Gemini calls, on top of
// concurrency limiting, as a belt-and-suspenders guard against 429s on
// the free tier.
const INTER_REQUEST_DELAY_MS = Number(process.env.INTER_REQUEST_DELAY_MS || 3000);

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

type RawCategory = "STOCK_NEWS" | "MACRO_POLITICAL" | "GENERAL_NOISE";
type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";

interface RawArticle {
  id: number | string;
  title: string;
  content: string;
  source: string;
  published_at: string;
  ticker_symbol: string | null;
  sector: string | null;
  category: RawCategory;
}

interface AiAnalysis {
  sentiment: Sentiment;
  ai_impact_summary: string;
}

interface ProcessedArticle {
  title: string;
  content: string;
  source: string;
  published_at: string;
  ticker_symbol: string | null;
  sector: string | null;
  category: RawCategory;
  sentiment: Sentiment;
  ai_impact_summary: string;
  is_systemic: boolean;
  embedding: number[];
}

// ---------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const GEMINI_API_KEY = requireEnv("GEMINI_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// ---------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** Sleep helper for backoff between retries / inter-request pacing. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini 429 responses include a suggested wait time, either as
 * `"retryDelay":"30s"` in the structured error details or as free text
 * like "Please retry in 30.95s." in the message. When present, honor it
 * instead of guessing — it's the authoritative answer for how long the
 * current rate-limit window has left.
 */
function extractSuggestedRetryDelayMs(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);

  const structuredMatch = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (structuredMatch) {
    return Math.ceil(parseFloat(structuredMatch[1]) * 1000);
  }

  const freeTextMatch = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (freeTextMatch) {
    return Math.ceil(parseFloat(freeTextMatch[1]) * 1000);
  }

  return null;
}

/** Retry wrapper with exponential backoff for flaky network/API calls. */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > maxRetries) {
        console.error(`[${label}] failed after ${maxRetries} retries.`);
        throw err;
      }

      const suggestedDelay = extractSuggestedRetryDelayMs(err);
      // Add a small buffer on top of Google's suggested wait so we land
      // just after the rate-limit window resets, not right on the edge.
      const delay =
        suggestedDelay !== null
          ? suggestedDelay + 1000
          : RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

      console.warn(
        `[${label}] attempt ${attempt} failed (${
          (err as Error).message
        }). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
}

/**
 * Splits an array into fixed-size batches, useful for bounding
 * concurrency when hitting external APIs.
 */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// ---------------------------------------------------------------------
// AI analysis: sentiment + impact summary (Gemini)
// ---------------------------------------------------------------------

const ANALYSIS_SYSTEM_PROMPT = `You are a financial news analyst for an Indian equities (Nifty 50) sentiment tracker.
Given a news article, you must:
1. Classify its market sentiment as exactly one of: BULLISH, BEARISH, NEUTRAL.
2. Write a concise, EXACTLY 2-sentence "ai_impact_summary" explaining how this news
   directly impacts stock performance, valuations, or industry margins. Be specific
   and quantitative where the article supports it (e.g. margins, revenue, demand,
   order books, regulatory costs). Avoid generic filler.`;

// Gemini structured-output schema — guarantees the model returns valid,
// on-shape JSON instead of us having to parse free-form text.
const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: ["BULLISH", "BEARISH", "NEUTRAL"],
    },
    ai_impact_summary: {
      type: Type.STRING,
      description: "Exactly 2 sentences explaining direct market impact.",
    },
  },
  required: ["sentiment", "ai_impact_summary"],
};

async function analyzeArticle(article: RawArticle): Promise<AiAnalysis> {
  const userPrompt = `Title: ${article.title}
Content: ${article.content}
Category: ${article.category}
Ticker: ${article.ticker_symbol ?? "N/A (macro/economy-wide news)"}
Sector: ${article.sector ?? "N/A"}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(raw) as Partial<AiAnalysis>;

    if (
      !parsed.sentiment ||
      !["BULLISH", "BEARISH", "NEUTRAL"].includes(parsed.sentiment)
    ) {
      throw new Error(`Invalid sentiment returned: ${parsed.sentiment}`);
    }
    if (!parsed.ai_impact_summary) {
      throw new Error("Missing ai_impact_summary in model response");
    }

    return {
      sentiment: parsed.sentiment as Sentiment,
      ai_impact_summary: parsed.ai_impact_summary,
    };
  }, `analyze:${article.id}`);
}

// ---------------------------------------------------------------------
// Mock embeddings (deterministic, free, no API call)
// ---------------------------------------------------------------------

/**
 * Deterministic pseudo-random number generator (mulberry32), seeded from
 * a 32-bit integer. Same seed -> same sequence of numbers every time.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derives a 32-bit integer seed from arbitrary text via SHA-256. */
function seedFromText(text: string): number {
  const hash = crypto.createHash("sha256").update(text).digest();
  return hash.readUInt32BE(0);
}

/**
 * Generates a deterministic, unit-length mock embedding for the given
 * text. NOT a real semantic embedding — just a stable, schema-compatible
 * stand-in so the pipeline (and pgvector column) can be exercised for
 * free. Identical input text always yields the identical vector.
 */
function mockEmbedding(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const rng = mulberry32(seedFromText(text));

  const vector: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    // Box-Muller transform for roughly normally-distributed values,
    // similar in spirit to real embedding value distributions.
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    vector[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Normalize to unit length so cosine distance behaves sensibly.
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / (magnitude || 1));
}

// ---------------------------------------------------------------------
// Per-article pipeline
// ---------------------------------------------------------------------

async function processArticle(
  article: RawArticle
): Promise<ProcessedArticle> {
  const analysis = await analyzeArticle(article);
  const embedding = mockEmbedding(`${article.title} ${article.content}`);

  return {
    title: article.title,
    content: article.content,
    source: article.source,
    published_at: article.published_at,
    ticker_symbol: article.ticker_symbol,
    sector: article.sector,
    category: article.category,
    sentiment: analysis.sentiment,
    ai_impact_summary: analysis.ai_impact_summary,
    is_systemic: article.category === "MACRO_POLITICAL",
    embedding,
  };
}

// ---------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------

/**
 * Fetches the set of stock symbols that currently exist in the `stocks`
 * table. Used to guard against foreign key violations: `articles.ticker_symbol`
 * references `stocks(symbol)`, so any article whose ticker isn't in the
 * master list would otherwise fail the whole upsert batch.
 */
async function fetchKnownStockSymbols(): Promise<Set<string>> {
  const { data, error } = await supabase.from("stocks").select("symbol");

  if (error) {
    throw new Error(`Failed to fetch stocks table: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(
      "⚠️  The `stocks` table is empty. Every ticker_symbol will be nulled " +
        "out to avoid foreign key violations. Run the stocks seed SQL first, " +
        "then re-run this script."
    );
  }

  // Normalize (trim + uppercase) so a stray space or casing difference
  // between `stocks.symbol` and an article's `ticker_symbol` can't cause
  // a silent, hard-to-debug mismatch.
  return new Set(
    (data ?? []).map((row) => (row.symbol as string).trim().toUpperCase())
  );
}

/**
 * Nulls out ticker_symbol / sets is_systemic accordingly for any article
 * whose ticker isn't present in the `stocks` table, logging a warning
 * per affected article rather than letting the whole upsert batch fail
 * on a foreign key violation.
 */
function reconcileTickersWithStocksTable(
  records: ProcessedArticle[],
  knownSymbols: Set<string>
): ProcessedArticle[] {
  return records.map((record) => {
    if (!record.ticker_symbol) {
      return record;
    }

    const normalized = record.ticker_symbol.trim().toUpperCase();

    if (!knownSymbols.has(normalized)) {
      console.warn(
        `⚠️  Ticker "${record.ticker_symbol}" not found in stocks table ` +
          `(article: "${record.title}"). Setting ticker_symbol to null so ` +
          `the upsert doesn't fail.`
      );
      return { ...record, ticker_symbol: null };
    }

    // Write back the normalized form so formatting stays consistent
    // even if the source JSON had stray casing/whitespace.
    return { ...record, ticker_symbol: normalized };
  });
}

async function upsertArticles(records: ProcessedArticle[]): Promise<void> {
  if (records.length === 0) {
    console.log("Nothing to upsert.");
    return;
  }

  const knownSymbols = await fetchKnownStockSymbols();
  const safeRecords = reconcileTickersWithStocksTable(records, knownSymbols);

  // Upsert in modest batches to keep payload sizes reasonable.
  const batches = chunk(safeRecords, 50);

  for (const [i, batch] of batches.entries()) {
    const { error } = await supabase
      .from("articles")
      .upsert(batch, { onConflict: "title,published_at" });

    if (error) {
      throw new Error(
        `Supabase upsert failed for batch ${i + 1}/${batches.length}: ${
          error.message
        }`
      );
    }

    console.log(
      `Upserted batch ${i + 1}/${batches.length} (${batch.length} records).`
    );
  }
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  console.log(`Using Gemini model: ${GEMINI_MODEL}`);
  console.log(`Reading ${INPUT_FILE} ...`);
  const raw = await fs.readFile(INPUT_FILE, "utf-8");
  const allArticles: RawArticle[] = JSON.parse(raw);

  let relevantArticles = allArticles.filter(
    (a) => a.category !== "GENERAL_NOISE"
  );

  console.log(
    `Loaded ${allArticles.length} articles. ` +
      `${relevantArticles.length} remain after filtering out GENERAL_NOISE.`
  );

  if (ARTICLE_LIMIT > 0 && ARTICLE_LIMIT < relevantArticles.length) {
    relevantArticles = relevantArticles.slice(0, ARTICLE_LIMIT);
    console.log(
      `[TEST MODE] ARTICLE_LIMIT=${ARTICLE_LIMIT} — processing only the first ${relevantArticles.length} articles.`
    );
  }

  const processed: ProcessedArticle[] = [];
  const batches = chunk(relevantArticles, CONCURRENCY);

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(
      `Processing batch ${batchIndex + 1}/${batches.length} ` +
        `(${batch.length} articles)...`
    );

    const results = await Promise.allSettled(batch.map(processArticle));

    results.forEach((result, idx) => {
      const article = batch[idx];
      if (result.status === "fulfilled") {
        processed.push(result.value);
      } else {
        console.error(
          `Failed to process article id=${article.id} ("${article.title}"): ${result.reason}`
        );
      }
    });

    // Extra pacing between batches, on top of per-call retry backoff,
    // to stay comfortably under free-tier rate limits.
    if (batchIndex < batches.length - 1 && INTER_REQUEST_DELAY_MS > 0) {
      await sleep(INTER_REQUEST_DELAY_MS);
    }
  }

  console.log(
    `Successfully processed ${processed.length}/${relevantArticles.length} articles.`
  );

  await upsertArticles(processed);

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
