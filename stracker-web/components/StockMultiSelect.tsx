"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import type { Stock } from "@/lib/types";

interface Props {
  stocks: Stock[];
  selected: string[];
  onChange: (symbols: string[]) => void;
}

export function StockMultiSelect({ stocks, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q)
    );
  }, [stocks, query]);

  function toggle(symbol: string) {
    if (selected.includes(symbol)) {
      onChange(selected.filter((s) => s !== symbol));
    } else {
      onChange([...selected, symbol]);
    }
  }

  function remove(symbol: string) {
    onChange(selected.filter((s) => s !== symbol));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border border-hairline bg-panel px-3 py-2.5 text-left text-sm text-text-muted hover:border-saffron/40"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {selected.length === 0 && (
            <span className="text-text-faint">Search stocks by symbol or name…</span>
          )}
          {selected.map((symbol) => (
            <span
              key={symbol}
              className="inline-flex items-center gap-1 bg-saffron-dim px-2 py-0.5 font-mono text-[11px] text-saffron"
            >
              {symbol}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(symbol);
                }}
              />
            </span>
          ))}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-faint" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full border border-hairline bg-panel shadow-xl">
          <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
            <Search className="h-4 w-4 text-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-faint">No matches.</div>
            )}
            {filtered.map((stock) => {
              const isSelected = selected.includes(stock.symbol);
              return (
                <label
                  key={stock.symbol}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-panel-hover"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(stock.symbol)}
                    className="h-3.5 w-3.5 accent-saffron"
                  />
                  <span className="font-mono text-[12px] text-saffron">
                    {stock.symbol}
                  </span>
                  <span className="truncate text-text-muted">
                    {stock.company_name}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-hairline px-3 py-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-mono text-[11px] uppercase tracking-wide text-text-faint hover:text-text-muted"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[11px] uppercase tracking-wide text-saffron hover:text-saffron-soft"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
