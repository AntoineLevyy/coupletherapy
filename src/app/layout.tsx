import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/ui/Header";
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
  title: "Couple Therapy — Relationship Coaching",
  description:
    "A voice-based, self-guided relationship coaching experience. Reflect on your patterns, communicate more clearly, and build a plan together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
        <AuthProvider>
          <Header />
          <div className="pt-[57px] flex-1 flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
