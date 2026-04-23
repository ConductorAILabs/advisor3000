export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { generateIdeas } from "@/lib/ideate";
import { sql } from "@/lib/neon";

export async function POST(req: NextRequest) {
  const { product, industry, target_audience, objective, media_type, tone, constraints } =
    await req.json();

  if (!product || !industry || !target_audience || !objective || !media_type) {
    return NextResponse.json(
      { error: "product, industry, target_audience, objective, and media_type are required" },
      { status: 400 },
    );
  }

  const brief = { product, industry, target_audience, objective, media_type, tone, constraints };

  const result = await generateIdeas(brief);

  const [row] = await sql`INSERT INTO ideations (brief, ideas) VALUES (${JSON.stringify(brief)}, ${JSON.stringify(result.ideas)}) RETURNING id`;

  return NextResponse.json({ ...result, id: row.id });
}
