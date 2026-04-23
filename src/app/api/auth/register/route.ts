import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/neon";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

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

  // Create a client for this user (each user gets their own org by default)
  const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
  const [client] = await sql`
    INSERT INTO clients (name, slug)
    VALUES (${name || email}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;

  const [user] = await sql`
    INSERT INTO users (email, name, password_hash, client_id, role)
    VALUES (${email}, ${name || null}, ${passwordHash}, ${client.id}, 'admin')
    RETURNING id, email, name, client_id, role
  `;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    clientId: user.client_id,
  });
}
