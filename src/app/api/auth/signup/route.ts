import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/neon";

// Creates a new user account. Mirrors /api/auth/register but uses the
// naming the voice-reactions signup gate expects ("sign up to hear reactions").
// Schema expected (see src/db/schema.sql):
//   users(id SERIAL PK, email TEXT UNIQUE NOT NULL, name TEXT,
//         password_hash TEXT NOT NULL, client_id INTEGER REFERENCES clients(id),
//         role TEXT DEFAULT 'user', created_at TIMESTAMPTZ DEFAULT NOW())
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || null;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Each signup gets its own client/org (keeps parity with /api/auth/register)
  const slug = email.split("@")[0].replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString(36);
  const [client] = await sql`
    INSERT INTO clients (name, slug)
    VALUES (${name || email}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;

  const [user] = await sql`
    INSERT INTO users (email, name, password_hash, client_id, role)
    VALUES (${email}, ${name}, ${passwordHash}, ${client.id}, 'user')
    RETURNING id, email, name, client_id, role
  `;

  return NextResponse.json({
    ok: true,
    id: user.id,
    email: user.email,
    name: user.name,
    clientId: user.client_id,
  });
}
