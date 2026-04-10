"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListeningPod } from "@/components/pod/ListeningPod";
import { saveSession } from "@/lib/store";

interface SessionRecord {
  id: string;
  mode: string;
  session_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
}

interface PlanItemRecord {
  id: string;
  day_number: number;
  action_type: string;
  title: string;
  description: string;
  why: string;
  completed: boolean;
}

export function LoggedInHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [planItems, setPlanItems] = useState<PlanItemRecord[]>([]);
  const [coupleCode, setCoupleCode] = useState<string | null>(null);
  const [hasPartner, setHasPartner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      const supabase = createClient();

      // Sessions
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false });
      if (sessionsData) setSessions(sessionsData);

      // Active plan items
      const { data: planData } = await supabase
        .from("plans")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (planData) {
        const { data: items } = await supabase
          .from("plan_items")
          .select("*")
          .eq("plan_id", planData.id)
          .order("day_number", { ascending: true });
        if (items) setPlanItems(items);
      }

      // Couple status
      const { data: coupleData } = await supabase
        .from("couples")
        .select("id, invite_code, status, partner_b")
        .or(`partner_a.eq.${user!.id},partner_b.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (coupleData) {
        if (coupleData.status === "active" && coupleData.partner_b) {
          setHasPartner(true);
        } else if (coupleData.status === "pending") {
          setCoupleCode(coupleData.invite_code);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [user]);

  function startCheckIn() {
    saveSession({
      mode: "together",
      sessionType: "ad-hoc",
      startedAt: new Date().toISOString(),
      transcript: [],
    });
    router.push("/session");
  }

  function startPlanAISession() {
    saveSession({
      mode: "together",
      sessionType: "check-in",
      startedAt: new Date().toISOString(),
      transcript: [],
    });
    router.push("/session");
  }

  async function togglePlanItem(item: PlanItemRecord) {
    const supabase = createClient();
    const newCompleted = !item.completed;
    await supabase
      .from("plan_items")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", item.id);
    setPlanItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: newCompleted } : i))
    );
  }

  async function generateInvite() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("couples")
      .insert({ partner_a: user.id })
      .select("invite_code")
      .single();
    if (data) setCoupleCode(data.invite_code);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function sessionLabel(type: string) {
    return type === "initial" ? "Coaching Session" :
           type === "check-in" ? "Check-In" :
           type === "state-of-union" ? "State of the Union" :
           type === "ad-hoc" ? "Ad-hoc Session" : "Session";
  }

  const completedItems = planItems.filter((i) => i.completed).length;
  const progress = planItems.length > 0 ? completedItems / planItems.length : 0;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ListeningPod state="thinking" size="md" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 md:px-12">
      <div className="max-w-3xl mx-auto">

        {/* ── Invite Partner ── */}
        {!hasPartner && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Invite your partner
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    Send them this link. Their answers stay private — always.
                  </p>
                </div>
                {coupleCode ? (
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                    >
                      <span className="text-[11px] font-mono truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>
                        {typeof window !== "undefined" ? `${window.location.origin}/join/${coupleCode}` : coupleCode}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-xs cursor-pointer px-3 py-1 rounded-full"
                        style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${coupleCode}`)}
                      >
                        Copy
                      </button>
                      <button
                        className="text-xs cursor-pointer px-3 py-1 rounded-full"
                        style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: "Join me on Couple Therapy",
                              text: "I started a coaching journey for us. Join here:",
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
                  <Button variant="secondary" size="sm" onClick={generateInvite}>
                    Generate Link
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Active Plan ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2
            className="text-xs uppercase tracking-wider mb-4"
            style={{ color: "var(--accent)", letterSpacing: "0.15em" }}
          >
            Your Plan
          </h2>

          {planItems.length > 0 ? (
            <Card>
              {/* Progress */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {completedItems} of {planItems.length} completed
                </span>
              </div>
              <div className="h-1.5 rounded-full w-full mb-5" style={{ background: "var(--bg-primary)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--accent)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {planItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: "var(--bg-primary)",
                      opacity: item.completed ? 0.45 : 1,
                    }}
                  >
                    {/* Checkbox (not for AI sessions) */}
                    {item.action_type !== "ai-session" ? (
                      <button
                        onClick={() => togglePlanItem(item)}
                        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer mt-0.5"
                        style={{
                          borderColor: item.completed ? "var(--success)" : "var(--border)",
                          background: item.completed ? "var(--success)" : "transparent",
                        }}
                      >
                        {item.completed && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "var(--accent-soft)" }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                          Day {item.day_number}
                        </span>
                        {item.action_type === "ai-session" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(196,149,106,0.15)", color: "var(--warning)" }}>
                            AI Session
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm"
                        style={{
                          color: "var(--text-primary)",
                          textDecoration: item.completed ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.description}
                      </p>

                      {/* Start button for AI sessions */}
                      {item.action_type === "ai-session" && !item.completed && (
                        <button
                          onClick={startPlanAISession}
                          className="mt-2 text-xs px-3 py-1.5 rounded-full cursor-pointer"
                          style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                        >
                          Start Session
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {sessions.length > 0
                    ? "Your plan will appear here after your next coaching session."
                    : "Complete your first session to get a personalized coaching plan."}
                </p>
              </div>
            </Card>
          )}
        </motion.div>

        {/* ── Ad-hoc Check-in ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover onClick={startCheckIn}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ListeningPod state="idle" size="sm" />
              </div>
              <div>
                <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Talk to your guide
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Start a conversation anytime — your guide remembers everything from previous sessions.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Session History ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2
            className="text-xs uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
          >
            Session History
          </h2>

          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card key={session.id} hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {sessionLabel(session.session_type)}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                        {formatDate(session.started_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: session.status === "completed" ? "var(--success)" : "var(--warning)",
                          color: "#fff",
                        }}
                      >
                        {session.status}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-muted)" }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <ListeningPod state="idle" size="sm" />
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  No sessions yet.
                </p>
                <Button className="mt-4" onClick={startCheckIn}>
                  Start Your First Session
                </Button>
              </div>
            </Card>
          )}
        </motion.div>

      </div>
    </main>
  );
}
