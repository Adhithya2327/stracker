import { NextRequest, NextResponse } from "next/server";
import { getNewsByTickers, getNewsBySector } from "@/lib/data";

export const revalidate = 60;

/**
 * GET /api/news/watchlist?tickers=TCS,INFY,RELIANCE
 * GET /api/news/watchlist?sector=Technology
 *
 * Exactly one of `tickers` or `sector` is expected — mirrors the UI's
 * "pick stocks OR a sector, not both" toggle. If both are supplied,
 * `tickers` takes precedence and `sector` is ignored.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tickersParam = searchParams.get("tickers");
  const sectorParam = searchParams.get("sector");

  try {
    if (tickersParam) {
      const tickers = tickersParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      if (tickers.length === 0) {
        return NextResponse.json({ articles: [] });
      }

      const articles = await getNewsByTickers(tickers);
      return NextResponse.json({ articles });
    }

    if (sectorParam) {
      const articles = await getNewsBySector(sectorParam);
      return NextResponse.json({ articles });
    }

    return NextResponse.json(
      { error: "Provide either `tickers` or `sector` as a query param." },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch watchlist news." },
      { status: 500 }
    );
  }
}
