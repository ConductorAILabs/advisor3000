import { NextRequest, NextResponse } from "next/server";
import { embed } from "@/lib/voyage";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/session";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { headlines, industry, media_type } = await req.json();

  if (!headlines || !Array.isArray(headlines) || headlines.length < 2) {
    return NextResponse.json({ error: "At least 2 headlines required" }, { status: 400 });
  }

  const embeddings = await embed(headlines);

  // Calculate pairwise similarity
  const similarities: { a: number; b: number; headline_a: string; headline_b: string; similarity: number }[] = [];
  for (let i = 0; i < headlines.length; i++) {
    for (let j = i + 1; j < headlines.length; j++) {
      similarities.push({
        a: i,
        b: j,
        headline_a: headlines[i],
        headline_b: headlines[j],
        similarity: cosineSimilarity(embeddings[i], embeddings[j]),
      });
    }
  }

  // Ask Claude to rank and compare
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are comparing ${headlines.length} ad campaign headlines for a ${industry || "general"} ${media_type || "digital"} campaign. Rank them by originality and explain the tradeoffs.

HEADLINES:
${headlines.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}

SEMANTIC SIMILARITY BETWEEN PAIRS:
${similarities.map((s) => `"${s.headline_a}" ↔ "${s.headline_b}": ${(s.similarity * 100).toFixed(1)}% similar`).join("\n")}

Return JSON:
{
  "ranking": [
    {
      "rank": 1,
      "headline": "...",
      "originality_estimate": <0-100>,
      "strengths": "<what makes this one stand out>",
      "risks": "<what could be derivative or weak about it>"
    }
  ],
  "recommendation": "<1-2 sentences: which headline to go with and why>",
  "pairwise_notes": [
    {"pair": "1 vs 2", "note": "<why these are similar or different>"}
  ]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const analysis = JSON.parse(text);

  return NextResponse.json({ similarities, analysis });
}
