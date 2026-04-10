"use client";

import { ConversationProvider } from "@elevenlabs/react";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConversationProvider>
      <div style={{ marginTop: "-57px" }}>{children}</div>
    </ConversationProvider>
  );
}
