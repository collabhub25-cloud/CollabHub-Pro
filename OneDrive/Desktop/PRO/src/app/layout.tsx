import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* Cinematic background */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            background: `radial-gradient(600px circle at 15% 25%, rgba(187,96,78,0.08), transparent 60%),
                         radial-gradient(700px circle at 85% 75%, rgba(70,84,120,0.07), transparent 60%)`,
            animation: 'drift 16s ease-in-out infinite alternate',
          }}
        />
        <style>{`
          @keyframes drift {
            from { transform: translateY(0px); }
            to { transform: translateY(-30px); }
          }
        `}</style>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
