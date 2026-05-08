import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/ui/Header";
import { ConversationRoot } from "@/components/ConversationRoot";
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
  title: "HappyCouple — Relationship Coaching",
  description:
    "Handle your relationship better, one moment at a time. Get clarity on what is underneath, what to say next, and how to move forward.",
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
          <ConversationRoot>
            <Header />
            <div className="pt-[57px] flex-1 flex flex-col">{children}</div>
          </ConversationRoot>
        </AuthProvider>
      </body>
    </html>
  );
}
