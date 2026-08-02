import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Article, SentimentBySector, Stock } from "@/lib/types";

const ARTICLE_COLUMNS =
  "id, title, content, source, published_at, ticker_symbol, sector, category, sentiment, ai_impact_summary, is_systemic";

/**
 * "High impact" news for the home page: systemic (macro/political) stories
 * that move the whole market rather than a single stock, newest first.
 */
export async function getHighImpactNews(limit = 20): Promise<Article[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .eq("is_systemic", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch high-impact news: ${error.message}`);
  }

  return (data ?? []) as Article[];
}

/**
 * A short scrolling feed for the ticker tape — most recent articles
 * across both categories, newest first.
 */
export async function getRecentHeadlines(limit = 12): Promise<Article[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent headlines: ${error.message}`);
  }

  return (data ?? []) as Article[];
}

/**
 * Sentiment counts grouped by sector, for stock-specific news only
 * (macro news has no single sector). Computed in-memory after a single
 * fetch rather than N queries — fine at this dataset size, and keeps
 * the DB schema free of a bespoke aggregation function.
 */
export async function getSentimentBySector(): Promise<SentimentBySector[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("sector, sentiment")
    .eq("category", "STOCK_NEWS")
    .not("sector", "is", null);

  if (error) {
    throw new Error(`Failed to fetch sentiment by sector: ${error.message}`);
  }

  const bySector = new Map<string, SentimentBySector>();

  for (const row of data ?? []) {
    const sector = row.sector as string;
    if (!bySector.has(sector)) {
      bySector.set(sector, { sector, bullish: 0, bearish: 0, neutral: 0 });
    }
    const entry = bySector.get(sector)!;
    if (row.sentiment === "BULLISH") entry.bullish += 1;
    else if (row.sentiment === "BEARISH") entry.bearish += 1;
    else if (row.sentiment === "NEUTRAL") entry.neutral += 1;
  }

  return Array.from(bySector.values()).sort(
    (a, b) =>
      b.bullish + b.bearish + b.neutral - (a.bullish + a.bearish + a.neutral)
  );
}

/** All tracked stocks, for populating the watchlist selectors. */
export async function getAllStocks(): Promise<Stock[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("stocks")
    .select("symbol, company_name, exchange, sector")
    .order("symbol", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch stocks: ${error.message}`);
  }

  return (data ?? []) as Stock[];
}

/** News filtered by one or more ticker symbols, newest first. */
export async function getNewsByTickers(tickers: string[]): Promise<Article[]> {
  if (tickers.length === 0) return [];

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .in("ticker_symbol", tickers)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch news by tickers: ${error.message}`);
  }

  return (data ?? []) as Article[];
}

/** News filtered by a single sector, newest first. */
export async function getNewsBySector(sector: string): Promise<Article[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .eq("sector", sector)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch news by sector: ${error.message}`);
  }

  return (data ?? []) as Article[];
}
