import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TERMINALUX - Real-time Crypto Trading Signals",
  description: "Advanced cryptocurrency trading signals with RSI divergence detection, multi-timeframe analysis, and real-time Binance Futures data. Track bullish and bearish divergences across 200+ USDT pairs.",
  keywords: "crypto trading signals, RSI divergence, cryptocurrency analysis, Binance futures, trading dashboard, technical analysis, TERMINALUX, crypto signals, divergence trading, RSI indicator",
  authors: [{ name: "TERMINALUX" }],
  creator: "TERMINALUX",
  publisher: "TERMINALUX",
  robots: "index, follow",
  openGraph: {
    title: "TERMINALUX - Real-time Crypto Trading Signals",
    description: "Advanced cryptocurrency trading signals with RSI divergence detection and multi-timeframe analysis",
    type: "website",
    locale: "en_US",
    siteName: "TERMINALUX",
  },
  twitter: {
    card: "summary_large_image",
    title: "TERMINALUX - Real-time Crypto Trading Signals",
    description: "Advanced cryptocurrency trading signals with RSI divergence detection",
    creator: "@josephvoxone",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#10b981",
  applicationName: "TERMINALUX",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
