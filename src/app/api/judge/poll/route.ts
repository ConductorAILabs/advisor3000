import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req: NextRequest) {
  const job_id = req.nextUrl.searchParams.get("job_id");
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const jobs = await sql`SELECT status, result, error FROM jobs WHERE id = ${job_id}`;
  if (!jobs[0]) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const job = jobs[0];
  if (job.status === "complete") return NextResponse.json({ status: "complete", result: job.result });
  if (job.status === "error") return NextResponse.json({ status: "error", error: job.error });
  return NextResponse.json({ status: "pending" });
}
