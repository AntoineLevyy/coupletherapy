"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListeningPod } from "@/components/pod/ListeningPod";

type Step = "welcome" | "auth" | "linking" | "linked" | "error";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { user, loading: authLoading, signUp, signIn } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, skip straight to linking
  useEffect(() => {
    if (authLoading) return;
    if (user && step === "welcome") {
      linkPartner();
    }
  }, [user, authLoading]);

  async function linkPartner() {
    setStep("linking");
    setError(null);

    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to link");
        setStep("error");
      } else {
        setStep("linked");
      }
    } catch {
      setError("Connection error. Please try again.");
      setStep("error");
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (authMode === "signup") {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    // Auth state change will trigger the useEffect above to link
  }

  // ── Welcome step ──
  if (step === "welcome" && !user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center mb-8">
            <ListeningPod state="idle" size="md" />
          </div>

          <h1
            className="text-2xl md:text-3xl font-light text-center tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Your partner invited you
          </h1>

          <p
            className="text-center mt-4 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Someone who cares about your relationship started a coaching journey
            and wants you to be part of it.
          </p>

          <Card className="mt-8">
            <div className="space-y-4">
              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-primary)" }}
              >
                <span style={{ color: "var(--accent)" }}>●</span>
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Your answers are private
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Your individual words are never shared with your partner.
                    Only synthesized themes are visible to both of you.
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-primary)" }}
              >
                <span style={{ color: "var(--accent)" }}>●</span>
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    A voice conversation, not a form
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    You&apos;ll speak with an AI coaching guide for about 15 minutes.
                    It listens, asks questions, and helps you reflect.
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-primary)" }}
              >
                <span style={{ color: "var(--accent)" }}>●</span>
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    Combined insights unlock together
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    When you both complete sessions, the app shows where your
                    perceptions align and where they diverge — without exposing
                    what either of you said.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={() => setStep("auth")}>
              Get Started
            </Button>
          </div>

          <p
            className="text-xs text-center mt-6"
            style={{ color: "var(--text-muted)" }}
          >
            This is self-guided coaching, not therapy.
          </p>
        </motion.div>
      </main>
    );
  }

  // ── Auth step ──
  if (step === "auth" || (step === "welcome" && !user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center mb-6">
            <ListeningPod state="idle" size="sm" />
          </div>

          <h2
            className="text-xl font-light text-center mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Create your account
          </h2>
          <p
            className="text-center text-sm mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            This links you with your partner and keeps your sessions private.
          </p>

          {/* Tabs */}
          <div
            className="flex rounded-full p-1 mb-6"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setAuthMode(m); setError(null); }}
                className="flex-1 py-2 text-sm rounded-full transition-all cursor-pointer"
                style={{
                  background: authMode === m ? "var(--accent)" : "transparent",
                  color: authMode === m ? "var(--bg-primary)" : "var(--text-muted)",
                  fontWeight: authMode === m ? 500 : 400,
                }}
              >
                {m === "signup" ? "New Account" : "Sign In"}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              placeholder={authMode === "signup" ? "Create password (6+ chars)" : "Password"}
            />

            {error && (
              <p className="text-sm text-center" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full text-sm font-medium cursor-pointer"
              style={{
                background: submitting ? "var(--bg-surface)" : "var(--accent)",
                color: submitting ? "var(--text-muted)" : "var(--bg-primary)",
              }}
              whileHover={submitting ? {} : { scale: 1.01 }}
              whileTap={submitting ? {} : { scale: 0.99 }}
            >
              {submitting ? "..." : authMode === "signup" ? "Create Account & Join" : "Sign In & Join"}
            </motion.button>
          </form>

          <button
            onClick={() => setStep("welcome")}
            className="block mx-auto mt-4 text-xs cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back
          </button>
        </motion.div>
      </main>
    );
  }

  // ── Linking step ──
  if (step === "linking") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <ListeningPod state="thinking" size="md" />
        <p style={{ color: "var(--text-secondary)" }}>Linking you with your partner...</p>
      </main>
    );
  }

  // ── Linked step ──
  if (step === "linked") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-md text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-center mb-6">
            <ListeningPod state="idle" size="md" />
          </div>

          <h1
            className="text-2xl font-light"
            style={{ color: "var(--text-primary)" }}
          >
            You&apos;re connected
          </h1>

          <p
            className="mt-4 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            You and your partner are now linked. Your individual sessions are
            private — only combined themes will be shared between you.
          </p>

          <p
            className="mt-3 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Ready for your first session? It takes about 15 minutes. Just you,
            speaking honestly with your guide.
          </p>

          <div className="mt-8 flex gap-3 justify-center">
            <Button size="lg" onClick={() => router.push("/onboarding")}>
              Start Your Session
            </Button>
          </div>

          <button
            onClick={() => router.push("/history")}
            className="block mx-auto mt-4 text-xs cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            Go to dashboard instead →
          </button>
        </motion.div>
      </main>
    );
  }

  // ── Error step ──
  if (step === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-md text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ListeningPod state="idle" size="sm" />
          <h2
            className="text-xl font-light mt-6"
            style={{ color: "var(--text-primary)" }}
          >
            Something went wrong
          </h2>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--danger)" }}
          >
            {error || "We couldn't link you with your partner."}
          </p>
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            The invite code may have expired or already been used. Ask your
            partner to generate a new one.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={() => { setError(null); setStep("welcome"); }}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Go Home
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  // Loading state
  return (
    <main className="min-h-screen flex items-center justify-center">
      <ListeningPod state="thinking" size="sm" />
    </main>
  );
}
