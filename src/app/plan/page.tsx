"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListeningPod } from "@/components/pod/ListeningPod";

interface PlanItemRecord {
  id: string;
  day_number: number;
  scheduled_date: string | null;
  action_type: string;
  title: string;
  description: string;
  why: string;
  completed: boolean;
  completed_at: string | null;
  reflection_notes: string | null;
}

const ACTION_TYPE_STYLES: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  exercise: {
    label: "Between You",
    color: "var(--success)",
    bg: "rgba(107, 158, 120, 0.15)",
  },
  practice: {
    label: "Practice",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
  },
  "ai-session": {
    label: "AI Check-In",
    color: "var(--warning)",
    bg: "rgba(196, 149, 106, 0.15)",
  },
  reflection: {
    label: "Reflection",
    color: "var(--text-secondary)",
    bg: "var(--bg-surface)",
  },
};

export default function PlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PlanItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    async function loadPlan() {
      const supabase = createClient();

      // Get the active plan
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!plan) {
        setLoading(false);
        return;
      }

      // Get plan items
      const { data: planItems } = await supabase
        .from("plan_items")
        .select("*")
        .eq("plan_id", plan.id)
        .order("day_number", { ascending: true });

      if (planItems) setItems(planItems);
      setLoading(false);
    }

    loadPlan();
  }, [user, authLoading, router]);

  async function toggleComplete(item: PlanItemRecord) {
    const supabase = createClient();
    const newCompleted = !item.completed;

    await supabase
      .from("plan_items")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            }
          : i
      )
    );
  }

  async function saveReflection(itemId: string) {
    if (!reflectionText.trim()) return;
    const supabase = createClient();

    await supabase
      .from("plan_items")
      .update({ reflection_notes: reflectionText })
      .eq("id", itemId);

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, reflection_notes: reflectionText } : i
      )
    );
    setReflectionText("");
    setExpandedItem(null);
  }

  function handleStartAISession(sessionType: "check-in" | "state-of-union") {
    // Store the session type and redirect to the session page
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "couple-therapy-session",
        JSON.stringify({
          mode: "together",
          sessionType,
          startedAt: new Date().toISOString(),
          transcript: [],
        })
      );
    }
    router.push("/session");
  }

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? completedCount / items.length : 0;

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <ListeningPod state="thinking" size="md" />
        <p style={{ color: "var(--text-secondary)" }}>Loading your plan...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 md:px-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className="text-2xl md:text-3xl font-light tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Your Coaching Plan
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {completedCount} of {items.length} completed
          </p>

          {/* Progress bar */}
          <div
            className="mt-4 h-2 rounded-full w-full"
            style={{ background: "var(--bg-elevated)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid gap-3 md:grid-cols-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover onClick={() => handleStartAISession("check-in")}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent-soft)" }}
              >
                <ListeningPod state="idle" size="sm" />
              </div>
              <div>
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  AI Check-In Session
                </h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Review your progress with your guide
                </p>
              </div>
            </div>
          </Card>

          <Card hover onClick={() => handleStartAISession("state-of-union")}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(107, 158, 120, 0.15)" }}
              >
                <span style={{ color: "var(--success)" }}>◎</span>
              </div>
              <div>
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  State of the Union
                </h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Structured check-in: appreciations, progress, concerns
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Plan Items */}
        {items.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p style={{ color: "var(--text-secondary)" }}>
                No active plan yet. Complete a coaching session to generate your
                personalized plan.
              </p>
              <div className="mt-4">
                <Button onClick={() => router.push("/onboarding")}>
                  Start a Session
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const typeStyle =
                ACTION_TYPE_STYLES[item.action_type] || ACTION_TYPE_STYLES.practice;
              const isExpanded = expandedItem === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div
                    className="rounded-2xl p-5 transition-all duration-300"
                    style={{
                      background: item.completed
                        ? "var(--bg-secondary)"
                        : "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      opacity: item.completed ? 0.7 : 1,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleComplete(item)}
                        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 cursor-pointer transition-colors"
                        style={{
                          borderColor: item.completed
                            ? "var(--success)"
                            : "var(--border)",
                          background: item.completed
                            ? "var(--success)"
                            : "transparent",
                        }}
                      >
                        {item.completed && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{ color: "var(--accent)" }}
                          >
                            Day {item.day_number}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: typeStyle.bg,
                              color: typeStyle.color,
                            }}
                          >
                            {typeStyle.label}
                          </span>
                        </div>

                        <h4
                          className="text-sm font-medium"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: item.completed
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {item.title}
                        </h4>
                        <p
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.description}
                        </p>
                        <p
                          className="text-xs mt-1 italic"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span
                            style={{
                              color: "var(--accent)",
                              fontStyle: "normal",
                            }}
                          >
                            Why:{" "}
                          </span>
                          {item.why}
                        </p>

                        {/* AI Session button */}
                        {item.action_type === "ai-session" && !item.completed && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStartAISession("check-in")
                              }
                            >
                              Start AI Session
                            </Button>
                          </div>
                        )}

                        {/* Reflection */}
                        {item.completed && !item.reflection_notes && (
                          <button
                            onClick={() => {
                              setExpandedItem(isExpanded ? null : item.id);
                              setReflectionText("");
                            }}
                            className="text-xs mt-2 cursor-pointer"
                            style={{ color: "var(--accent)" }}
                          >
                            + Add a reflection
                          </button>
                        )}

                        {item.reflection_notes && (
                          <div
                            className="mt-2 text-xs p-3 rounded-lg"
                            style={{
                              background: "var(--bg-primary)",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span
                              className="block text-[10px] uppercase tracking-wider mb-1"
                              style={{ color: "var(--accent)" }}
                            >
                              Your reflection
                            </span>
                            {item.reflection_notes}
                          </div>
                        )}

                        {isExpanded && (
                          <motion.div
                            className="mt-3"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                          >
                            <textarea
                              value={reflectionText}
                              onChange={(e) =>
                                setReflectionText(e.target.value)
                              }
                              placeholder="How did it go? What did you notice?"
                              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                              style={{
                                background: "var(--bg-primary)",
                                border: "1px solid var(--border)",
                                color: "var(--text-primary)",
                                minHeight: 60,
                              }}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() => saveReflection(item.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedItem(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <motion.div
          className="mt-8 flex justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button variant="secondary" onClick={() => router.push("/history")}>
            View History
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Home
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
