"use client";

import { useEffect, useMemo, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { StockMultiSelect } from "@/components/StockMultiSelect";
import { SectorSelect } from "@/components/SectorSelect";
import { NewsListSkeleton } from "@/components/Skeleton";
import type { Article, Stock } from "@/lib/types";

type Mode = "stocks" | "sector";

const STORAGE_KEY = "stracker:watchlist-selection";

interface StoredSelection {
  mode: Mode;
  tickers: string[];
  sector: string | null;
}

export default function WatchlistPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("stocks");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the last selection so a refresh doesn't lose your filters.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredSelection = JSON.parse(raw);
        setMode(stored.mode);
        setSelectedTickers(stored.tickers);
        setSelectedSector(stored.sector);
      }
    } catch {
      // Corrupt or missing storage — just start fresh.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change, once initial hydration has happened (avoids
  // overwriting saved state with the empty initial values on first render).
  useEffect(() => {
    if (!hydrated) return;
    const toStore: StoredSelection = {
      mode,
      tickers: selectedTickers,
      sector: selectedSector,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [hydrated, mode, selectedTickers, selectedSector]);

  // Load the stock list once, for both selectors.
  useEffect(() => {
    fetch("/api/stocks")
      .then((res) => res.json())
      .then((data) => setStocks(data.stocks ?? []))
      .catch(() => setError("Couldn't load the stock list."))
      .finally(() => setStocksLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const s of stocks) {
      if (s.sector) set.add(s.sector);
    }
    return Array.from(set).sort();
  }, [stocks]);

  // Switching modes clears the other mode's selection, keeping the two
  // filters mutually exclusive as intended.
  function switchMode(next: Mode) {
    setMode(next);
    setSelectedTickers([]);
    setSelectedSector(null);
    setArticles([]);
  }

  useEffect(() => {
    const hasQuery =
      (mode === "stocks" && selectedTickers.length > 0) ||
      (mode === "sector" && !!selectedSector);

    if (!hasQuery) {
      setArticles([]);
      return;
    }

    const params = new URLSearchParams();
    if (mode === "stocks") {
      params.set("tickers", selectedTickers.join(","));
    } else if (selectedSector) {
      params.set("sector", selectedSector);
    }

    setLoading(true);
    setError(null);

    fetch(`/api/news/watchlist?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setArticles(data.articles ?? []);
      })
      .catch(() => setError("Couldn't load news for this selection."))
      .finally(() => setLoading(false));
  }, [mode, selectedTickers, selectedSector]);

  const hasSelection =
    (mode === "stocks" && selectedTickers.length > 0) ||
    (mode === "sector" && !!selectedSector);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Follow specific stocks, or scan an entire sector at once.
        </p>
      </div>

      <div className="border border-hairline bg-panel p-5">
        <div className="mb-4 inline-flex border border-hairline">
          <button
            type="button"
            onClick={() => switchMode("stocks")}
            className={`px-4 py-1.5 font-mono text-[12px] uppercase tracking-wide ${
              mode === "stocks"
                ? "bg-saffron-dim text-saffron"
                : "text-text-muted hover:text-text"
            }`}
          >
            By stocks
          </button>
          <button
            type="button"
            onClick={() => switchMode("sector")}
            className={`border-l border-hairline px-4 py-1.5 font-mono text-[12px] uppercase tracking-wide ${
              mode === "sector"
                ? "bg-saffron-dim text-saffron"
                : "text-text-muted hover:text-text"
            }`}
          >
            By sector
          </button>
        </div>

        {stocksLoading ? (
          <div className="h-10 w-full animate-pulse rounded-sm bg-panel-hover" />
        ) : mode === "stocks" ? (
          <StockMultiSelect
            stocks={stocks}
            selected={selectedTickers}
            onChange={setSelectedTickers}
          />
        ) : (
          <SectorSelect
            sectors={sectors}
            value={selectedSector}
            onChange={setSelectedSector}
          />
        )}
      </div>

      <section>
        {!hasSelection && (
          <div className="border border-hairline bg-panel p-8 text-center text-sm text-text-muted">
            {mode === "stocks"
              ? "Pick one or more stocks above to see news that impacts them."
              : "Pick a sector above to see news across every stock in it."}
          </div>
        )}

        {hasSelection && loading && (
          <>
            <div className="mb-3 h-3 w-24 animate-pulse rounded-sm bg-panel-hover" />
            <NewsListSkeleton count={4} />
          </>
        )}

        {error && (
          <div className="border border-bearish/40 bg-bearish-dim p-4 text-sm text-bearish">
            {error}
          </div>
        )}

        {hasSelection && !loading && !error && (
          <>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-wide text-text-faint">
              {articles.length} {articles.length === 1 ? "article" : "articles"}
            </div>
            <div className="flex flex-col gap-3">
              {articles.length === 0 && (
                <div className="border border-hairline bg-panel p-8 text-center text-sm text-text-muted">
                  No news found for this selection yet.
                </div>
              )}
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
