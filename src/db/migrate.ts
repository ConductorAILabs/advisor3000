import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "../lib/neon";

async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
    console.log("done:", statement.slice(0, 60) + "...");
  }

  console.log("\nMigration complete.");
}

migrate().catch(console.error);
