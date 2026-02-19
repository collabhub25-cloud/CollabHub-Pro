import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollabHub - Startup Collaboration Platform",
  description: "Connect verified talents, founders, and investors. Build successful startups with trust-based collaboration, automated agreements, and milestone tracking.",
  keywords: ["CollabHub", "Startup", "Collaboration", "Founders", "Talent", "Investors", "SaaS"],
  authors: [{ name: "CollabHub Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CollabHub - Startup Collaboration Platform",
    description: "Connect verified talents, founders, and investors",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CollabHub - Startup Collaboration Platform",
    description: "Connect verified talents, founders, and investors",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
