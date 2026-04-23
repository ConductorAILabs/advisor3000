import "dotenv/config";
import { sql } from "../lib/neon";

async function addIdeationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ideations (
      id SERIAL PRIMARY KEY,
      brief JSONB NOT NULL,
      ideas JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Ideations table created.");
}

addIdeationsTable().catch(console.error);
