import type { SentimentBySector } from "@/lib/types";

export function SentimentStats({ data }: { data: SentimentBySector[] }) {
  const totals = data.reduce(
    (acc, row) => ({
      bullish: acc.bullish + row.bullish,
      bearish: acc.bearish + row.bearish,
      neutral: acc.neutral + row.neutral,
    }),
    { bullish: 0, bearish: 0, neutral: 0 }
  );

  const stats = [
    { label: "Bullish", value: totals.bullish, color: "text-bullish" },
    { label: "Bearish", value: totals.bearish, color: "text-bearish" },
    { label: "Neutral", value: totals.neutral, color: "text-neutral" },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-hairline border border-hairline bg-panel">
      {stats.map((stat) => (
        <div key={stat.label} className="px-5 py-4">
          <div className="text-[11px] font-mono uppercase tracking-wide text-text-faint">
            {stat.label}
          </div>
          <div className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
