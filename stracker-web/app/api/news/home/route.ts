import { NextResponse } from "next/server";
import { getHighImpactNews, getSentimentBySector } from "@/lib/data";

export const revalidate = 60;

export async function GET() {
  try {
    const [highImpactNews, sentimentBySector] = await Promise.all([
      getHighImpactNews(20),
      getSentimentBySector(),
    ]);

    return NextResponse.json({ highImpactNews, sentimentBySector });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch home feed." },
      { status: 500 }
    );
  }
}
