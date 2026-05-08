"use client";

import { ConversationProvider } from "@elevenlabs/react";

export function ConversationRoot({ children }: { children: React.ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
