import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.clientId) return NextResponse.json({ campaigns: [] });

  const campaigns = await sql`
    SELECT c.id, c.headline, c.industry, c.media_type, c.language, c.created_at,
           v.score, v.verdict
    FROM campaigns c
    LEFT JOIN verdicts v ON v.campaign_id = c.id
    WHERE c.client_id = ${user.clientId}
    ORDER BY c.created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({ campaigns });
}
