import { NextResponse } from "next/server";
import { getAllStocks } from "@/lib/data";

export const revalidate = 300; // 5 min — stock metadata barely changes

export async function GET() {
  try {
    const stocks = await getAllStocks();
    return NextResponse.json({ stocks });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch stocks." },
      { status: 500 }
    );
  }
}
