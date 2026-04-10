"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase";
import { loadSession } from "@/lib/store";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Migrate a free session from localStorage to Supabase via API.
 * Runs once after login/signup if there's unsaved session data.
 */
async function migrateLocalSession() {
  const sessionData = loadSession();
  if (!sessionData?.synthesis) return;

  const migrationKey = `saved-${sessionData.startedAt}`;
  if (typeof window !== "undefined" && localStorage.getItem(migrationKey)) return;

  try {
    const res = await fetch("/api/save-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: sessionData.mode,
        sessionType: sessionData.sessionType || "initial",
        startedAt: sessionData.startedAt,
        completedAt: sessionData.completedAt,
        transcript: sessionData.transcript,
        synthesis: sessionData.synthesis,
      }),
    });

    if (res.ok) {
      if (typeof window !== "undefined") {
        localStorage.setItem(migrationKey, "true");
      }
      console.log("[Migration] Free session saved to Supabase");
    } else {
      const data = await res.json();
      console.error("[Migration] Failed:", data.error);
    }
  } catch (err) {
    console.error("[Migration] Error:", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Migrate local session data when user signs in
      if (session?.user) {
        migrateLocalSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
