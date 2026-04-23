import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { campaign_id } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const campaigns = await sql`SELECT id FROM campaigns WHERE id = ${campaign_id}`;
  if (!campaigns[0]) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  const job_id = randomUUID();
  await sql`INSERT INTO jobs (id, campaign_id, status) VALUES (${job_id}, ${campaign_id}, 'pending')`;

  // Fire background function — don't await
  const base = process.env.URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  fetch(`${base}/.netlify/functions/judge-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id, campaign_id }),
  }).catch(() => {});

  return NextResponse.json({ job_id });
}
