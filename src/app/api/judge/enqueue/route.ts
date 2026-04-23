import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { campaign_id } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const campaigns = await sql`SELECT id, client_id FROM campaigns WHERE id = ${campaign_id}`;
  const campaign = campaigns[0];
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });
  if (campaign.client_id !== user.clientId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Sweep stale pending jobs (>10 min old) as a crash-recovery measure.
  // Wrapped in try/catch in case the jobs table predates a created_at column.
  try {
    await sql`UPDATE jobs SET status = 'error', error = 'timed out' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes'`;
  } catch { /* ignore */ }

  const job_id = randomUUID();
  await sql`INSERT INTO jobs (id, campaign_id, status) VALUES (${job_id}, ${campaign_id}, 'pending')`;

  const base = process.env.URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  fetch(`${base}/.netlify/functions/judge-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id, campaign_id }),
  }).catch(() => {});

  return NextResponse.json({ job_id });
}
