import type { Sentiment } from "@/lib/types";

const CONFIG: Record<
  Sentiment,
  { label: string; glyph: string; text: string; bg: string }
> = {
  BULLISH: {
    label: "Bullish",
    glyph: "▲",
    text: "text-bullish",
    bg: "bg-bullish-dim",
  },
  BEARISH: {
    label: "Bearish",
    glyph: "▼",
    text: "text-bearish",
    bg: "bg-bearish-dim",
  },
  NEUTRAL: {
    label: "Neutral",
    glyph: "▬",
    text: "text-neutral",
    bg: "bg-neutral-dim",
  },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) return null;
  const cfg = CONFIG[sentiment];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide ${cfg.text} ${cfg.bg}`}
    >
      <span aria-hidden="true">{cfg.glyph}</span>
      {cfg.label.toUpperCase()}
    </span>
  );
}
