export type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Category = "STOCK_NEWS" | "MACRO_POLITICAL";

export interface Article {
  id: number;
  title: string;
  content: string | null;
  source: string | null;
  published_at: string | null;
  ticker_symbol: string | null;
  sector: string | null;
  category: Category;
  sentiment: Sentiment | null;
  ai_impact_summary: string | null;
  is_systemic: boolean;
}

export interface Stock {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string | null;
}

export interface SentimentBySector {
  sector: string;
  bullish: number;
  bearish: number;
  neutral: number;
}
