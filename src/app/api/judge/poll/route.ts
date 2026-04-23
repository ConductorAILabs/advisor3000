import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const job_id = req.nextUrl.searchParams.get("job_id");
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const jobs = await sql`
    SELECT j.status, j.result, j.error, c.client_id
    FROM jobs j
    JOIN campaigns c ON c.id = j.campaign_id
    WHERE j.id = ${job_id}
  `;
  if (!jobs[0]) return NextResponse.json({ error: "job not found" }, { status: 404 });
  if (jobs[0].client_id !== user.clientId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const job = jobs[0];
  if (job.status === "complete") return NextResponse.json({ status: "complete", result: job.result });
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error });
  return NextResponse.json({ status: "pending" });
}
