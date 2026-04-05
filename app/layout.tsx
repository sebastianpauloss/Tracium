import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tracium — Blockchain Wallet Intelligence",
  description:
    "Analyze wallet relationships, trace transactions, and detect risk across Ethereum, Solana, TRON, and Bitcoin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased min-h-screen">
        {/* Top navigation */}
        <nav className="border-b border-bg-border bg-bg-secondary/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-neon-green flex items-center justify-center text-bg-primary font-black text-sm">
                ⬡
              </div>
              <span className="font-bold text-text-primary tracking-tight">
                Traci<span className="text-neon-green">um</span>
              </span>
            </a>

            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-xs text-text-muted hover:text-neon-green transition-colors"
              >
                Explorer
              </a>
              <a
                href="/compare"
                className="text-xs text-text-muted hover:text-neon-blue transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                Compare
              </a>
              <span className="text-xs px-2.5 py-1 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20 font-medium">
                Beta
              </span>
            </div>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}
