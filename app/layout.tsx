// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zey-search.vercel.app";
const TITLE = "Zey Search — AI Search Engine";
// BUG FIX: this description ("Next-gen AI Web Search Synthesizer...") and the
// actual on-page tagline in search-page.tsx ("Mesin pencari berbasis AI
// ringkas, cepat, akurat, dan transparan.") told two different stories — one
// English, one Indonesian — for the same product. Search engines and social
// previews now use the same Indonesian tagline the UI actually shows.
const DESCRIPTION = "Mesin pencari berbasis AI: ringkas, cepat, akurat, dan transparan dengan atribusi sumber.";

export const metadata: Metadata = {
  // BUG FIX: metadataBase was missing — Next.js resolves relative OG/Twitter
  // image URLs (like the auto-detected opengraph-image.tsx added below)
  // against localhost without this, breaking link previews in production.
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | Zey Search",
  },
  description: DESCRIPTION,
  keywords: ["AI search engine", "mesin pencari AI", "Zey Search", "Zey Ecosystem", "pencarian pintar"],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: BASE_URL,
    siteName: "Zey Search",
    locale: "id_ID",
    type: "website",
    // No need to list `images` manually — Next.js auto-detects
    // app/opengraph-image.tsx by file convention and wires it in here.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Addition: `viewport` (themeColor) was split out of `metadata` as of Next 14
// and wasn't set at all — without it, mobile browser chrome stays the
// browser's default color instead of matching the app's dark background.
export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
