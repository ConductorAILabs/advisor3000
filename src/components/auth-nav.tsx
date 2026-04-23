"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-[var(--text-muted)] text-sm">...</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-xs text-[var(--text-muted)]">{session.user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors text-sm"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors text-sm font-medium"
    >
      Sign in
    </Link>
  );
}
