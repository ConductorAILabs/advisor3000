import type { BackgroundHandler } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

export const handler: BackgroundHandler = async (event) => {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const { job_id, campaign_id } = JSON.parse(event.body || "{}");
  if (!job_id || !campaign_id) return;

  try {
    const base = process.env.URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`/api/judge returned ${res.status}: ${text}`);
    }

    const result = await res.json();
    await sql`UPDATE jobs SET status = 'complete', result = ${JSON.stringify(result)} WHERE id = ${job_id}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await sql`UPDATE jobs SET status = 'error', error = ${msg} WHERE id = ${job_id}`;
    } catch { /* ignore */ }
  }
};
