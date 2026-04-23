import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/neon";

export async function GET() {
  const session = await getServerSession(authOptions);

  const clientId = session?.user
    ? (session.user as Record<string, unknown>).clientId as number | null
    : null;

  let campaigns;
  if (clientId) {
    campaigns = await sql`
      SELECT c.id, c.headline, c.industry, c.media_type, c.language, c.created_at,
             v.score, v.verdict
      FROM campaigns c
      LEFT JOIN verdicts v ON v.campaign_id = c.id
      WHERE c.client_id = ${clientId}
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
  } else {
    campaigns = await sql`
      SELECT c.id, c.headline, c.industry, c.media_type, c.language, c.created_at,
             v.score, v.verdict
      FROM campaigns c
      LEFT JOIN verdicts v ON v.campaign_id = c.id
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json({ campaigns });
}
