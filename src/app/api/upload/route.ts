import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { embed } from "@/lib/voyage";
import { getNamespace } from "@/lib/turbopuffer";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { headline, body_copy, script, industry, media_type, language, brief, target_audience, objective } =
    await req.json();

  if (!headline || !industry || !media_type) {
    return NextResponse.json(
      { error: "headline, industry, and media_type are required" },
      { status: 400 },
    );
  }

  const cid = user.clientId;
  const bc = body_copy || null;
  const sc = script || null;
  const lang = language || "en";
  const br = brief || null;
  const ta = target_audience || null;
  const obj = objective || null;

  const [campaign] = await sql`
    INSERT INTO campaigns (client_id, headline, body_copy, script, industry, media_type, language, brief, target_audience, objective)
    VALUES (${cid}, ${headline}, ${bc}, ${sc}, ${industry}, ${media_type}, ${lang}, ${br}, ${ta}, ${obj})
    RETURNING id
  `;

  const textToEmbed = [headline, body_copy, script].filter(Boolean).join(" | ");
  const [embedding] = await embed([textToEmbed]);

  const ns = getNamespace();
  await ns.write({
    upsert_rows: [
      {
        id: `campaign-${campaign.id}`,
        vector: embedding,
        headline,
        industry,
        media_type,
        language: lang,
        source: "client-upload",
        type: "campaign",
      },
    ],
    distance_metric: "cosine_distance",
  });

  return NextResponse.json({ id: campaign.id, status: "uploaded" });
}
