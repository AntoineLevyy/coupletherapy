"use client";

import { ConversationProvider } from "@elevenlabs/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
