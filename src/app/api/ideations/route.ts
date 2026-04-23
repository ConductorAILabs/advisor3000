import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  const rows = await sql`
    SELECT id, brief, ideas, created_at
    FROM ideations
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ ideations: rows });
}
