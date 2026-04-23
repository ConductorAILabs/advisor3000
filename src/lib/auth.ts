import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/neon";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = await sql`
          SELECT id, email, name, password_hash, client_id, role
          FROM users
          WHERE email = ${credentials.email}
        `;

        const user = rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          clientId: user.client_id,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.clientId = (user as unknown as Record<string, unknown>).clientId as number | null;
        token.role = (user as unknown as Record<string, unknown>).role as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.sub;
        (session.user as Record<string, unknown>).clientId = token.clientId;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET is required in production");
    }
    return "dev-only-insecure-secret";
  })(),
};
