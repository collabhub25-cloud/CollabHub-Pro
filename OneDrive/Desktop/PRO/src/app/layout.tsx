import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { ConditionalBeamBg } from "@/components/providers/conditional-beam-bg";
import { AOSProvider } from "@/components/providers/aos-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlloySphere - Startup Collaboration Platform",
  description: "Connect verified talents, founders, and investors. Build successful startups with trust-based collaboration, automated agreements, and milestone tracking.",
  keywords: ["AlloySphere", "Startup", "Collaboration", "Founders", "Talent", "Investors", "SaaS"],
  authors: [{ name: "AlloySphere Team" }],
  icons: {
    icon: "/logo.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "AlloySphere - Startup Collaboration Platform",
    description: "Connect verified talents, founders, and investors",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlloySphere - Startup Collaboration Platform",
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-transparent text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AOSProvider>
            <ConditionalBeamBg />
            <Suspense fallback={null}>
              {children}
            </Suspense>
            <Toaster />
          </AOSProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
