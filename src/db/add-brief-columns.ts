import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

async function run() {
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief TEXT`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective TEXT`;
  console.log("Added brief, target_audience, objective columns to campaigns");
}

run().catch(console.error);
