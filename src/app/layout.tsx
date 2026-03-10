import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PCAHA Stats | Pacific Coast Amateur Hockey Association",
  description: "Live standings, player stats, and league leaders for all PCAHA hockey divisions. Updated daily.",
  keywords: ["PCAHA", "hockey", "stats", "standings", "minor hockey", "BC hockey"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
          <p>PCAHA Stats is an unofficial stats tracker. Not affiliated with PCAHA or Spordle.</p>
          <p className="mt-1">Data sourced from games.pcaha.ca</p>
        </footer>
      </body>
    </html>
  );
}
