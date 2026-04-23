export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { predictEffectiveness } from "@/lib/effectiveness";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline, body_copy, script, industry, media_type } = body;

    if (!headline || !industry || !media_type) {
      return NextResponse.json(
        { error: "headline, industry, and media_type are required" },
        { status: 400 }
      );
    }

    const result = await predictEffectiveness({
      headline,
      body_copy,
      script,
      industry,
      media_type,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Effectiveness prediction failed:", err);
    return NextResponse.json(
      { error: "Failed to predict effectiveness" },
      { status: 500 }
    );
  }
}
