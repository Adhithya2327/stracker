import type { Article } from "@/lib/types";

const DOT_COLOR: Record<string, string> = {
  BULLISH: "bg-bullish",
  BEARISH: "bg-bearish",
  NEUTRAL: "bg-neutral",
};

function TapeItem({ article }: { article: Article }) {
  return (
    <span className="mx-6 inline-flex items-center gap-2 whitespace-nowrap font-mono text-[13px]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          article.sentiment ? DOT_COLOR[article.sentiment] : "bg-text-faint"
        }`}
        aria-hidden="true"
      />
      {article.ticker_symbol && (
        <span className="text-saffron">{article.ticker_symbol}</span>
      )}
      <span className="text-text-muted">{article.title}</span>
    </span>
  );
}

export function TickerTape({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;

  // Duplicate the list so the CSS marquee (translateX -50%) loops seamlessly.
  const doubled = [...articles, ...articles];

  return (
    <div
      className="group relative overflow-hidden border-y border-hairline bg-panel py-2.5"
      role="region"
      aria-label="Latest headlines, scrolling"
    >
      <div className="animate-ticker-scroll flex w-max group-hover:[animation-play-state:paused]">
        {doubled.map((article, i) => (
          <TapeItem key={`${article.id}-${i}`} article={article} />
        ))}
      </div>
    </div>
  );
}
