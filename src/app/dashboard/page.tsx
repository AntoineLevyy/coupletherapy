"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListeningPod } from "@/components/pod/ListeningPod";
import {
  loadSession,
  saveSession,
  clearSession,
  type SynthesisData,
  type PlanItem,
} from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

// ── Helper Components ──

function DimensionBar({ score, delay, confidence }: { score: number; delay: number; confidence: string }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "var(--bg-primary)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{
          background: confidence === "needs-more" ? "var(--text-muted)" : "var(--accent)",
          opacity: confidence === "needs-more" ? 0.4 : confidence === "emerging" ? 0.7 : 1,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${(score / 5) * 100}%` }}
        transition={{ delay, duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function PatternBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    low: { bg: "var(--success)", text: "#fff" },
    moderate: { bg: "var(--warning)", text: "#fff" },
    elevated: { bg: "var(--danger)", text: "#fff" },
  };
  const c = colors[level] || colors.moderate;
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: c.bg, color: c.text }}>
      {level}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  if (confidence === "clear") return null;
  const styles: Record<string, { label: string; color: string }> = {
    emerging: { label: "Early signal", color: "var(--warning)" },
    "needs-more": { label: "Needs more conversation", color: "var(--text-muted)" },
  };
  const s = styles[confidence] || styles.emerging;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ border: `1px solid ${s.color}`, color: s.color }}>
      {s.label}
    </span>
  );
}

function EvidenceBlock({ evidence }: { evidence: string }) {
  if (!evidence) return null;
  return (
    <div className="mt-2 text-xs leading-relaxed p-3 rounded-lg" style={{ background: "var(--bg-primary)", borderLeft: "2px solid var(--accent)", color: "var(--text-muted)" }}>
      <span className="uppercase tracking-wider text-[10px] block mb-1" style={{ color: "var(--accent)" }}>From your conversation</span>
      {evidence}
    </div>
  );
}

function WhyBlock({ why }: { why: string }) {
  return (
    <p className="mt-1.5 text-xs leading-relaxed italic" style={{ color: "var(--text-muted)" }}>
      <span style={{ color: "var(--accent)", fontStyle: "normal" }}>Why: </span>{why}
    </p>
  );
}

function PlanTrack({ title, subtitle, color, items }: { title: string; subtitle: string; color: string; items: PlanItem[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <h3 className="text-xs uppercase tracking-wider" style={{ color, letterSpacing: "0.15em" }}>{title}</h3>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>— {subtitle}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="p-4 rounded-xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>{item.day}</span>
              {item.type === "ai-session" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(196, 149, 106, 0.15)", color: "var(--warning)" }}>AI Session</span>
              )}
              {item.type === "reflection" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>Reflection</span>
              )}
            </div>
            <h4 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{item.action}</h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.detail}</p>
            <WhyBlock why={item.why} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your conversation...");
  const [error, setError] = useState<string | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synthesize on mount
  useEffect(() => {
    const session = loadSession();
    if (!session) { router.push("/"); return; }
    if (session.synthesis) { setSynthesis(session.synthesis); setLoading(false); return; }
    if (!session.transcript || session.transcript.length === 0) {
      setError("No conversation data found. Please complete a session first.");
      setLoading(false);
      return;
    }

    async function synthesize() {
      const messages = ["Analyzing your conversation...", "Identifying patterns...", "Assessing confidence levels...", "Building your personalized plan..."];
      let msgIdx = 0;
      const interval = setInterval(() => { msgIdx = (msgIdx + 1) % messages.length; setLoadingMessage(messages[msgIdx]); }, 3000);

      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: session!.transcript, mode: session!.mode }),
        });
        clearInterval(interval);
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Synthesis failed"); }
        const data: SynthesisData = await res.json();
        setSynthesis(data);
        saveSession({ ...session!, synthesis: data });
      } catch (err) {
        clearInterval(interval);
        setError(err instanceof Error ? err.message : "Failed to analyze. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    synthesize();
  }, [router]);

  // Save session to Supabase when user is logged in
  useEffect(() => {
    if (authLoading || !user || !synthesis) return;
    const session = loadSession();
    if (!session) return;

    const migrationKey = `saved-${session.startedAt}`;
    if (localStorage.getItem(migrationKey)) return;

    async function saveToSupabase() {
      try {
        const res = await fetch("/api/save-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: session!.mode,
            sessionType: session!.sessionType || "initial",
            startedAt: session!.startedAt,
            completedAt: session!.completedAt,
            transcript: session!.transcript,
            synthesis,
          }),
        });

        if (res.ok) {
          localStorage.setItem(migrationKey, "true");
          console.log("[Save] Session saved to Supabase (including plan items)");
        } else {
          const data = await res.json();
          console.error("[Save] Failed:", data.error);
        }
      } catch (err) {
        console.error("[Save] Error:", err);
      }
    }
    saveToSupabase();
  }, [user, authLoading, synthesis]);

  // Voice readback using ElevenLabs TTS API
  const handleReadAloud = useCallback(async () => {
    if (!synthesis?.voiceScript) return;

    // If already playing, stop
    if (isReadingAloud && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsReadingAloud(false);
      return;
    }

    // Prevent double-click while loading
    if (audioLoading) return;

    setAudioLoading(true);

    try {
      const res = await fetch("/api/voice-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: synthesis.voiceScript }),
      });

      if (!res.ok) throw new Error("Voice generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsReadingAloud(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsReadingAloud(false);
        URL.revokeObjectURL(url);
      };

      audioRef.current = audio;
      setIsReadingAloud(true);
      await audio.play();
    } catch (err) {
      console.error("Voice readback error:", err);
      setIsReadingAloud(false);
    } finally {
      setAudioLoading(false);
    }
  }, [synthesis, isReadingAloud, audioLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  function handleNewSession() { window.speechSynthesis.cancel(); clearSession(); router.push("/"); }
  function handleRetry() {
    const session = loadSession();
    if (session) saveSession({ ...session, synthesis: undefined });
    setError(null); setLoading(true); router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <ListeningPod state="thinking" size="md" />
        <motion.p style={{ color: "var(--text-secondary)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{loadingMessage}</motion.p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <ListeningPod state="idle" size="sm" />
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <div className="flex gap-3"><Button onClick={handleRetry}>Try Again</Button><Button variant="secondary" onClick={handleNewSession}>Start Over</Button></div>
      </main>
    );
  }

  if (!synthesis) return null;

  // Handle both old format (sevenDayPlan) and new format (plan)
  const plan = synthesis.plan || { track1: [], track2: [], track3: [] };

  return (
    <main className="min-h-screen px-6 py-12 md:px-12" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Pod — clickable to read results */}
          <div className="flex justify-center mb-3">
            <button
              onClick={synthesis?.voiceScript ? handleReadAloud : undefined}
              disabled={!synthesis?.voiceScript}
              className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
            >
              <ListeningPod state={audioLoading ? "thinking" : isReadingAloud ? "speaking" : "idle"} size="md" />
            </button>
          </div>

          {/* Subtle read prompt below pod */}
          {synthesis?.voiceScript && (
            <motion.button
              className="mb-6 px-5 py-2 rounded-full cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={audioLoading}
              style={{
                background: isReadingAloud ? "var(--accent)" : "var(--accent-soft)",
                color: isReadingAloud ? "var(--bg-primary)" : "var(--accent)",
                border: `1px solid ${isReadingAloud ? "var(--accent)" : "var(--accent)"}`,
              }}
              onClick={handleReadAloud}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-sm font-medium">
                {audioLoading ? "Connecting..." : isReadingAloud ? "Stop Reading" : "Tap to Listen"}
              </span>
            </motion.button>
          )}

          <h1 className="text-3xl md:text-4xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>Your Relationship Snapshot</h1>
          <p className="mt-3 text-lg" style={{ color: "var(--text-secondary)" }}>{synthesis.summary}</p>

          {/* Confidence framing */}
          {synthesis.confidenceNote && (
            <p className="mt-3 text-xs max-w-lg mx-auto leading-relaxed px-4 py-2 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              {synthesis.confidenceNote}
            </p>
          )}

          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>This is a coaching reflection, not a clinical assessment.</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Strengths */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--success)", letterSpacing: "0.15em" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />Strength Signals
              </h2>
              <ul className="space-y-4">
                {synthesis.strengths.map((s, i) => (
                  <li key={i}>
                    <p className="text-sm leading-relaxed pl-4" style={{ color: "var(--text-secondary)", borderLeft: "2px solid var(--success)" }}>{s.insight}</p>
                    <EvidenceBlock evidence={s.evidence} />
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Tension Themes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--warning)", letterSpacing: "0.15em" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />Tension Themes
              </h2>
              <ul className="space-y-4">
                {synthesis.tensionThemes.map((t, i) => (
                  <li key={i}>
                    <p className="text-sm leading-relaxed pl-4" style={{ color: "var(--text-secondary)", borderLeft: "2px solid var(--warning)" }}>{t.insight}</p>
                    <EvidenceBlock evidence={t.evidence} />
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Conflict Patterns */}
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}>Conflict Pattern Indicators</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {synthesis.conflictPatterns.map((cp, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cp.pattern}</span>
                        <ConfidenceBadge confidence={cp.confidence} />
                      </div>
                      <PatternBadge level={cp.level} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{cp.description}</p>
                    <EvidenceBlock evidence={cp.evidence} />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Dimensions */}
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}>Coaching Dimensions</h2>
              <div className="space-y-6">
                {synthesis.dimensions.map((dim, i) => (
                  <div key={dim.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{dim.name}</span>
                        <ConfidenceBadge confidence={dim.confidence} />
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{dim.score}/5</span>
                    </div>
                    <DimensionBar score={dim.score} delay={0.5 + i * 0.1} confidence={dim.confidence} />
                    <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>{dim.insight}</p>
                    <EvidenceBlock evidence={dim.evidence} />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Repair Capacity */}
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}>Repair Capacity</h2>
                <ConfidenceBadge confidence={synthesis.repairCapacity.confidence} />
              </div>
              <span className="text-sm font-medium capitalize" style={{ color: synthesis.repairCapacity.level === "strong" ? "var(--success)" : synthesis.repairCapacity.level === "moderate" ? "var(--warning)" : "var(--text-secondary)" }}>
                {synthesis.repairCapacity.level}
              </span>
              <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>{synthesis.repairCapacity.explanation}</p>
              <EvidenceBlock evidence={synthesis.repairCapacity.evidence} />
            </Card>
          </motion.div>

          {/* Coaching Priorities */}
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />Coaching Priorities
              </h2>
              <div className="space-y-4">
                {synthesis.coachingPriorities.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{i + 1}</span>
                    <div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.priority}</p>
                      <WhyBlock why={p.why} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* 3-Track Plan */}
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <h2 className="text-xs uppercase tracking-wider mb-8" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Your Personalized Coaching Plan</h2>

              <div className="space-y-10">
                {plan.track1 && plan.track1.length > 0 && (
                  <PlanTrack title="Immediate Practice" subtitle="Days 1–3 targeting your primary pattern" color="var(--danger)" items={plan.track1} />
                )}
                {plan.track2 && plan.track2.length > 0 && (
                  <PlanTrack title="Connection Building" subtitle="Days 4–7 strengthening your foundation" color="var(--success)" items={plan.track2} />
                )}
                {plan.track3 && plan.track3.length > 0 && (
                  <PlanTrack title="AI Check-Ins" subtitle="Guided sessions with your coaching guide" color="var(--warning)" items={plan.track3} />
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Save prompt for non-logged-in users */}
        {!authLoading && !user && (
          <motion.div className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
            <Card>
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Save your results</h3>
                <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Create a free account to keep your coaching history, track your progress over time, invite your partner, and get ongoing AI check-ins.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push("/auth/login")}>Create Account</Button>
                  <Button variant="secondary" onClick={() => router.push("/auth/login")}>Sign In</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div className="mt-12 flex flex-col items-center gap-4 pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Button onClick={handleNewSession}>Start a New Session</Button>
          <p className="text-xs max-w-md text-center" style={{ color: "var(--text-muted)" }}>
            This reflection is based on a single coaching conversation. For deeper support, we recommend connecting with a licensed relationship professional.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
