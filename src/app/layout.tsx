import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
});

const SITE_URL = "https://www.pcahastats.com";
const SITE_NAME = "PCAHA Stats";
const SITE_DESCRIPTION =
  "Live standings, player stats, and league leaders for all PCAHA minor hockey divisions in British Columbia. Updated daily for the 2025-26 season.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PCAHA Stats | Pacific Coast Amateur Hockey Association",
    template: "%s | PCAHA Stats",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "PCAHA",
    "hockey stats",
    "hockey standings",
    "minor hockey",
    "BC hockey",
    "Pacific Coast Amateur Hockey Association",
    "youth hockey",
    "PCAHA standings",
    "PCAHA leaders",
    "hockey player stats",
    "British Columbia hockey",
    "2025-26 hockey season",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "PCAHA Stats | Pacific Coast Amateur Hockey Association",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "PCAHA Stats | Pacific Coast Amateur Hockey Association",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/standings/rep/{search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}
      >
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
          <p>
            PCAHA Stats is an unofficial stats tracker. Not affiliated with
            PCAHA or Spordle.
          </p>
          <p className="mt-1">Data sourced from games.pcaha.ca</p>
        </footer>
      </body>
    </html>
  );
}
