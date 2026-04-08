"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ListeningPod } from "@/components/pod/ListeningPod";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        router.push("/history");
      }
    }

    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="max-w-sm w-full text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-center mb-6">
            <ListeningPod state="idle" size="sm" />
          </div>
          <h1
            className="text-xl font-light"
            style={{ color: "var(--text-primary)" }}
          >
            Check your email
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            We sent a link to{" "}
            <span style={{ color: "var(--accent)" }}>{email}</span>. Click it to
            get started.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-8 text-xs cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to home
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="max-w-sm w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Pod */}
        <div className="flex justify-center mb-8">
          <ListeningPod state="idle" size="sm" />
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-full p-1 mb-8"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {(["signup", "login"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className="flex-1 py-2.5 text-sm rounded-full transition-all cursor-pointer"
              style={{
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "var(--bg-primary)" : "var(--text-muted)",
                fontWeight: mode === m ? 500 : 400,
              }}
            >
              {m === "signup" ? "Create Account" : "Sign In"}
            </button>
          ))}
        </div>

        {/* Subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={mode}
            className="text-center text-sm mb-8"
            style={{ color: "var(--text-secondary)" }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "signup"
              ? "Save your sessions, track progress, and invite your partner."
              : "Welcome back to your coaching journey."}
          </motion.p>
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] uppercase tracking-widest mb-2"
              style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all focus:ring-1"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[10px] uppercase tracking-widest mb-2"
              style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-sm text-center py-2 px-4 rounded-lg"
                style={{
                  color: "var(--danger)",
                  background: "rgba(196, 106, 106, 0.1)",
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-sm font-medium cursor-pointer transition-all"
            style={{
              background: loading ? "var(--bg-surface)" : "var(--accent)",
              color: loading ? "var(--text-muted)" : "var(--bg-primary)",
              opacity: loading ? 0.6 : 1,
            }}
            whileHover={loading ? {} : { scale: 1.01 }}
            whileTap={loading ? {} : { scale: 0.99 }}
          >
            {loading ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {mode === "signup" ? "Creating account..." : "Signing in..."}
              </motion.span>
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Continue without account */}
        <button
          onClick={() => router.push("/onboarding")}
          className="w-full py-3 rounded-full text-sm cursor-pointer transition-all"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          Try a free session without an account
        </button>

        {/* Privacy note */}
        <p
          className="text-[10px] text-center mt-6 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Your data is encrypted and your individual answers are never shared
          with your partner.
        </p>
      </motion.div>
    </main>
  );
}
