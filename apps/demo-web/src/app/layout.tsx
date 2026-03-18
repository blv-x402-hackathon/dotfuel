import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { GNB } from "@/components/GNB";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dotfuel-demo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "DotFuel", template: "%s | DotFuel" },
  description: "DotFuel — Pay gas with any token",
  openGraph: {
    title: "DotFuel",
    description: "Pay blockchain gas with any token. Zero native balance required.",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DotFuel social preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "DotFuel",
    description: "Pay blockchain gas with any token. Zero native balance required.",
    images: ["/opengraph-image"]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <Providers>
          <GNB />
          {children}
        </Providers>
      </body>
    </html>
  );
}
