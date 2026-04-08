"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListeningPod } from "@/components/pod/ListeningPod";

export default function JoinPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    if (!user) {
      // Redirect to signup, then come back
      router.push(`/auth/login?next=/join&code=${code}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ListeningPod state="thinking" size="sm" />
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          className="max-w-md text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ListeningPod state="idle" size="sm" />
          <h1
            className="text-2xl font-light mt-6"
            style={{ color: "var(--text-primary)" }}
          >
            You&apos;re linked
          </h1>
          <p
            className="mt-4 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            You and your partner are now connected. Your individual sessions
            stay private — only synthesized themes will be shared in combined
            reports.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Button onClick={() => router.push("/onboarding")}>
              Start Your Session
            </Button>
            <Button variant="secondary" onClick={() => router.push("/history")}>
              View History
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center mb-8">
          <ListeningPod state="idle" size="sm" />
        </div>

        <h1
          className="text-2xl md:text-3xl font-light text-center mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Join your partner
        </h1>
        <p
          className="text-center mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Enter the invite code your partner shared with you.
        </p>

        <Card>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-xs uppercase tracking-wider mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Invite Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono tracking-wider text-center"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="e.g. a1b2c3d4e5f6"
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}

            {!user && (
              <p
                className="text-xs text-center"
                style={{ color: "var(--text-muted)" }}
              >
                You&apos;ll need to create an account or sign in to link with your
                partner.
              </p>
            )}

            <Button size="lg" disabled={loading} className="w-full">
              {loading ? "Linking..." : user ? "Join Partner" : "Sign Up & Join"}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => router.push("/")}>
            ← Back to Home
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
