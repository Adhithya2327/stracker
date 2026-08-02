import type { Article } from "@/lib/types";
import { SentimentBadge } from "@/components/SentimentBadge";

const SENTIMENT_BORDER: Record<string, string> = {
  BULLISH: "border-l-bullish",
  BEARISH: "border-l-bearish",
  NEUTRAL: "border-l-neutral",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function NewsCard({ article }: { article: Article }) {
  const borderClass = article.sentiment
    ? SENTIMENT_BORDER[article.sentiment]
    : "border-l-hairline";

  return (
    <article
      className={`border-l-2 ${borderClass} border-y border-r border-hairline bg-panel px-5 py-4 transition-colors hover:bg-panel-hover`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-text-faint">
        {article.ticker_symbol && (
          <span className="text-saffron">{article.ticker_symbol}</span>
        )}
        {article.sector && <span>{article.sector}</span>}
        <span>{article.source}</span>
        <span>{formatDate(article.published_at)}</span>
      </div>

      <h3 className="mt-2 font-display text-[17px] font-medium leading-snug text-text">
        {article.title}
      </h3>

      {article.ai_impact_summary && (
        <p className="mt-2 text-[14px] leading-relaxed text-text-muted">
          {article.ai_impact_summary}
        </p>
      )}

      <div className="mt-3">
        <SentimentBadge sentiment={article.sentiment} />
      </div>
    </article>
  );
}
