import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Providers } from "./providers";
import { AuthNav } from "@/components/auth-nav";

export const metadata: Metadata = {
  title: "Advisor 3000 — Is Your Creative Truly Original?",
  description: "Check for unoriginality, plagiarism, and other classic creative money-grabs.",
  openGraph: {
    title: "Advisor 3000 — Is Your Creative Truly Original?",
    description: "Check for unoriginality, plagiarism, and other classic creative money-grabs.",
    images: [{ url: "/og-image.png", width: 1456, height: 816, alt: "Advisor 3000" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advisor 3000 — Is Your Creative Truly Original?",
    description: "Check for unoriginality, plagiarism, and other classic creative money-grabs.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
        <Providers>
          <nav className="fixed top-0 left-0 right-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/">
                <Image src="/advisor3000.png" alt="Advisor 3000" width={140} height={52} className="h-10 w-auto" priority />
              </Link>
              <div className="flex items-center gap-1 text-sm">
                {[
                  { href: "/analyze", label: "Analyze" },
                  { href: "/brief-score", label: "Brief Score" },
                  { href: "/compare", label: "Compare" },
                  { href: "/claims", label: "Claims" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="w-px h-5 bg-white/20 mx-2" />
                <AuthNav />
              </div>
            </div>
          </nav>
          <main className="max-w-6xl mx-auto px-6 pt-[65px]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
