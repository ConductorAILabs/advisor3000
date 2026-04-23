import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Providers } from "./providers";
import { AuthNav } from "@/components/auth-nav";

export const metadata: Metadata = {
  metadataBase: new URL("https://adjudge-app.netlify.app"),
  title: "Ad-Visor 3000 — How Original Is Your Creative?",
  description: "Find out if your creative is original without having to search for hours on end.",
  openGraph: {
    title: "Ad-Visor 3000 — How Original Is Your Creative?",
    description: "Find out if your creative is original without having to search for hours on end.",
    url: "https://adjudge-app.netlify.app",
    siteName: "Ad-Visor 3000",
    images: [{ url: "/og-image.png", width: 2342, height: 1312, alt: "Ad-Visor 3000" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ad-Visor 3000 — How Original Is Your Creative?",
    description: "Find out if your creative is original without having to search for hours on end.",
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
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
              <Link href="/" className="shrink-0">
                <Image src="/advisor3000.png" alt="Advisor 3000" width={480} height={180} className="h-20 w-auto drop-shadow-lg" priority />
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
          <main className="max-w-6xl mx-auto px-6 pt-[110px]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
