import { NextRequest, NextResponse } from "next/server";
import { detectTrends } from "@/lib/trends";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const industry = searchParams.get("industry") || undefined;
  const days = searchParams.get("days")
    ? parseInt(searchParams.get("days")!, 10)
    : 30;

  try {
    const report = await detectTrends({ industry, days });
    return NextResponse.json(report);
  } catch (error) {
    console.error("Trends detection failed:", error);
    return NextResponse.json(
      { error: "Failed to detect trends" },
      { status: 500 }
    );
  }
}
