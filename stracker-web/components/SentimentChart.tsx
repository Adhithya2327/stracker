"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SentimentBySector } from "@/lib/types";

export function SentimentChart({ data }: { data: SentimentBySector[] }) {
  if (data.length === 0) {
    return (
      <div className="border border-hairline bg-panel p-8 text-center text-sm text-text-muted">
        No sector data yet.
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-panel p-4">
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#22303C" vertical={false} />
          <XAxis
            dataKey="sector"
            tick={{ fill: "#8C99A6", fontSize: 11, fontFamily: "var(--font-mono)" }}
            angle={-45}
            textAnchor="end"
            height={90}
            interval={0}
            axisLine={{ stroke: "#22303C" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#8C99A6", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#22303C" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#111823",
              border: "1px solid #22303C",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            cursor={{ fill: "rgba(255,153,51,0.05)" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={32}
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <Bar dataKey="bullish" name="Bullish" fill="#22C58B" radius={[2, 2, 0, 0]} />
          <Bar dataKey="bearish" name="Bearish" fill="#F1554C" radius={[2, 2, 0, 0]} />
          <Bar dataKey="neutral" name="Neutral" fill="#93A1AF" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
