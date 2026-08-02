import { getHighImpactNews, getRecentHeadlines, getSentimentBySector } from "@/lib/data";
import { TickerTape } from "@/components/TickerTape";
import { SentimentStats } from "@/components/SentimentStats";
import { SentimentChart } from "@/components/SentimentChart";
import { NewsCard } from "@/components/NewsCard";

export const revalidate = 60;

export default async function HomePage() {
  const [highImpactNews, sentimentBySector, recentHeadlines] = await Promise.all([
    getHighImpactNews(20),
    getSentimentBySector(),
    getRecentHeadlines(14),
  ]);

  return (
    <div className="space-y-10">
      <TickerTape articles={recentHeadlines} />

      <section>
        <h1 className="font-display text-2xl font-semibold text-text">
          Market pulse
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Sentiment across the Nifty 50, derived from today's tracked news.
        </p>

        <div className="mt-5">
          <SentimentStats data={sentimentBySector} />
        </div>

        <div className="mt-5">
          <SentimentChart data={sentimentBySector} />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold text-text">
            High-impact news
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-wide text-text-faint">
            Macro &amp; policy — moves the whole market
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {highImpactNews.length === 0 && (
            <div className="border border-hairline bg-panel p-8 text-center text-sm text-text-muted">
              No high-impact news yet. Run the ingestion pipeline to populate
              this feed.
            </div>
          )}
          {highImpactNews.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
