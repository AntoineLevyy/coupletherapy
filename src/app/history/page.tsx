"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListeningPod } from "@/components/pod/ListeningPod";

interface SessionRecord {
  id: string;
  mode: string;
  session_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
}

interface DimensionRecord {
  dimension_id: string;
  dimension_name: string;
  score: number;
  created_at: string;
  session_id: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [dimensions, setDimensions] = useState<DimensionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupleCode, setCoupleCode] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    async function loadData() {
      const supabase = createClient();

      // Load sessions
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false });

      if (sessionsData) setSessions(sessionsData);

      // Load dimension scores for trend tracking
      const { data: dimData } = await supabase
        .from("dimension_scores")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });

      if (dimData) setDimensions(dimData);

      // Load couple invite code
      const { data: coupleData } = await supabase
        .from("couples")
        .select("invite_code")
        .eq("partner_a", user!.id)
        .eq("status", "pending")
        .single();

      if (coupleData) setCoupleCode(coupleData.invite_code);

      setLoading(false);
    }

    loadData();
  }, [user, authLoading, router]);

  // Group dimension scores by dimension for trend display
  const dimensionTrends = dimensions.reduce<
    Record<string, { name: string; scores: { date: string; score: number }[] }>
  >((acc, d) => {
    if (!acc[d.dimension_id]) {
      acc[d.dimension_id] = { name: d.dimension_name, scores: [] };
    }
    acc[d.dimension_id].scores.push({
      date: d.created_at,
      score: d.score,
    });
    return acc;
  }, {});

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function sessionTypeLabel(type: string) {
    const labels: Record<string, string> = {
      initial: "Initial Session",
      "check-in": "Check-In",
      "state-of-union": "State of the Union",
      "ad-hoc": "Ad-hoc Session",
    };
    return labels[type] || type;
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <ListeningPod state="thinking" size="md" />
        <p style={{ color: "var(--text-secondary)" }}>Loading your history...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 md:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1
              className="text-2xl md:text-3xl font-light tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Your Journey
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} completed
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/onboarding")}>
              New Session
            </Button>
          </div>
        </motion.div>

        {/* Partner invite */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Invite your partner
                </h3>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Send them this link. They&apos;ll create their own account and
                  link with you. Their answers stay private — always.
                </p>
              </div>
              {coupleCode ? (
                <div className="flex flex-col items-end gap-2">
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-xs font-mono truncate max-w-[200px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {window.location.origin}/join/{coupleCode}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs cursor-pointer px-3 py-1 rounded-full transition-colors"
                      style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${coupleCode}`)}
                    >
                      Copy Link
                    </button>
                    <button
                      className="text-xs cursor-pointer px-3 py-1 rounded-full transition-colors"
                      style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: "Join me on Couple Therapy",
                            text: "I started a coaching journey for us. Your answers are private — only shared themes are visible. Join here:",
                            url: `${window.location.origin}/join/${coupleCode}`,
                          });
                        } else {
                          navigator.clipboard.writeText(`${window.location.origin}/join/${coupleCode}`);
                        }
                      }}
                    >
                      Share
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const supabase = createClient();
                    const { data } = await supabase
                      .from("couples")
                      .insert({ partner_a: user!.id })
                      .select("invite_code")
                      .single();
                    if (data) setCoupleCode(data.invite_code);
                  }}
                >
                  Generate Code
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Dimension Trends */}
        {Object.keys(dimensionTrends).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card>
              <h2
                className="text-xs uppercase tracking-wider mb-6"
                style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
              >
                Your Progress Over Time
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(dimensionTrends).map(([id, trend]) => (
                  <div key={id}>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {trend.name}
                      </span>
                      {trend.scores.length > 1 && (
                        <span
                          className="text-xs"
                          style={{
                            color:
                              trend.scores[trend.scores.length - 1].score >
                              trend.scores[0].score
                                ? "var(--success)"
                                : trend.scores[trend.scores.length - 1].score <
                                  trend.scores[0].score
                                ? "var(--danger)"
                                : "var(--text-muted)",
                          }}
                        >
                          {trend.scores[trend.scores.length - 1].score >
                          trend.scores[0].score
                            ? "↑ Improving"
                            : trend.scores[trend.scores.length - 1].score <
                              trend.scores[0].score
                            ? "↓ Needs attention"
                            : "→ Stable"}
                        </span>
                      )}
                    </div>
                    {/* Simple trend visualization */}
                    <div className="flex items-end gap-1 h-8">
                      {trend.scores.map((s, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${(s.score / 5) * 100}%`,
                            background: "var(--accent)",
                            opacity: 0.3 + (i / trend.scores.length) * 0.7,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {trend.scores[0]?.score}/5
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {trend.scores[trend.scores.length - 1]?.score}/5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Session List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2
            className="text-xs uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
          >
            Session History
          </h2>

          {sessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p style={{ color: "var(--text-secondary)" }}>
                  No sessions yet. Start your first coaching conversation.
                </p>
                <div className="mt-4">
                  <Button onClick={() => router.push("/onboarding")}>
                    Begin Session
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id} hover onClick={() => {}}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {sessionTypeLabel(session.session_type)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              session.status === "completed"
                                ? "var(--success)"
                                : "var(--warning)",
                            color: "#fff",
                          }}
                        >
                          {session.status}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                          }}
                        >
                          {session.mode}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(session.started_at)}
                      </p>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sign out */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              const { useAuth: _ } = await import("@/lib/auth-context");
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
            }}
          >
            Sign Out
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
