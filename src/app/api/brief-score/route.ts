export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { scoreBrief } from "@/lib/brief-score";

export async function POST(req: NextRequest) {
  const { description, industry, target_audience, objective, media_type, tone, constraints, budget_context } = await req.json();

  if (!description || !industry || !target_audience || !objective || !media_type) {
    return NextResponse.json({ error: "description, industry, target_audience, objective, and media_type are required" }, { status: 400 });
  }

  const result = await scoreBrief({ description, industry, target_audience, objective, media_type, tone, constraints, budget_context });
  return NextResponse.json(result);
}
