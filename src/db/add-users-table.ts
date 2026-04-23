import "dotenv/config";
import { sql } from "../lib/neon";

async function addUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT,
      password_hash TEXT NOT NULL,
      client_id     INTEGER REFERENCES clients(id),
      role          TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Users table created.");
}

addUsersTable().catch(console.error);
