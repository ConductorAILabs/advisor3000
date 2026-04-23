import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/neon";
import { embed } from "@/lib/voyage";
import { getNamespace } from "@/lib/turbopuffer";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const { headline, body_copy, script, industry, media_type, language, client_id, brief, target_audience, objective } =
    await req.json();

  if (!headline || !industry || !media_type) {
    return NextResponse.json(
      { error: "headline, industry, and media_type are required" },
      { status: 400 },
    );
  }

  // Use the authenticated user's client_id if available, fall back to body param
  const sessionClientId = session?.user
    ? (session.user as Record<string, unknown>).clientId as number | null
    : null;
  const cid = sessionClientId || client_id || null;
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
