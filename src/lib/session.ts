import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email: string;
  clientId: number | null;
  role: string;
};

export async function requireUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as Record<string, unknown>;
  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    clientId: (u.clientId as number | null) ?? null,
    role: String(u.role ?? "user"),
  };
}
