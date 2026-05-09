"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ListeningPod } from "@/components/pod/ListeningPod";
import { Button } from "@/components/ui/Button";
import { useConversation } from "@elevenlabs/react";
import { getFirstMessageUndecided, getSystemPrompt } from "@/lib/system-prompt";
import { buildMomentReportPreview, shouldOfferReportFromUserMessage, type MomentReportPreview } from "@/lib/moment-report";
import { saveSession, type SynthesisData } from "@/lib/store";
import { track } from "@/lib/track";

const STARTER_TRANSCRIPT: TranscriptMessage[] = [];

const PROMPT_ROTATION = [
  "We keep having the same fight",
  "My partner gets defensive",
  "I need to bring up something hard",
  "I want to apologize better",
  "I feel disconnected lately",
  "We need to talk about money",
  "I’m not sure if I’m overreacting",
  "We’re struggling with intimacy",
  "I want us to feel close again",
  "I need help repairing after a fight",
  "I feel like I’m carrying everything",
  "We keep misunderstanding each other",
  "I want to ask for more support",
  "I’m scared this will become a fight",
  "Help me say this without blame",
];

const MOMENT_STEPS = [
  {
    number: "01",
    title: "Bring one real moment",
    description:
      "Start with the thing in front of you: a fight, apology, hard conversation, distance, money, intimacy, or a feeling you can’t quite name.",
    detail: "Under 2 minutes",
  },
  {
    number: "02",
    title: "Understand what is underneath",
    description:
      "Your coach makes the moment concrete, names the likely pattern, and separates what happened from what each person may be protecting.",
    detail: "Clearer pattern",
  },
  {
    number: "03",
    title: "Leave with better next words",
    description:
      "Get what to say, what to avoid, and a next move that reduces defensiveness instead of escalating the same loop.",
    detail: "Practical action",
  },
];

const PRODUCT_STEPS = [
  {
    title: "Initial session",
    eyebrow: "Start here",
    description:
      "Talk through one concrete relationship moment. HappyCouple asks who is present, gets the situation specific, and helps you decide the next useful move.",
  },
  {
    title: "Private report",
    eyebrow: "After the conversation",
    description:
      "The session becomes a short relationship brief: what happened, what may be underneath, what to say next, and what not to do.",
  },
  {
    title: "Partner loop",
    eyebrow: "When useful",
    description:
      "Invite your partner into a calmer version of the context — not a blame dump, but a shared starting point for the conversation.",
  },
  {
    title: "Check-ins",
    eyebrow: "Keep it alive",
    description:
      "Short follow-ups ask what happened, whether the pattern showed up again, and what needs repair before resentment builds.",
  },
  {
    title: "Relationship map",
    eyebrow: "Over time",
    description:
      "HappyCouple tracks recurring triggers, repair habits, unresolved topics, and moments of closeness so the coaching gets more specific.",
  },
  {
    title: "Coaching plan",
    eyebrow: "Bigger picture",
    description:
      "A lightweight monthly plan focuses the relationship on the 2–3 patterns most worth working on — practical coaching, not therapy or diagnosis.",
  },
];

type TranscriptMessage = {
  speaker: "HappyCouple" | "You";
  text: string;
};

type VoiceStatus = "idle" | "connecting" | "active" | "error";
type AgentMode = "speaking" | "listening";

const TRUST_POINTS = [
  "Solo or together — the coach asks who is present before adapting the session.",
  "Private by design — individual answers are not exposed as raw partner ammunition.",
  "Grounded in relationship research, but framed as coaching — not diagnosis, not therapy.",
  "Built around real conversations, repair, and follow-through instead of generic advice.",
];

function buildSynthesisFromMomentReport(report: MomentReportPreview): SynthesisData {
  return {
    summary: report.moment,
    confidenceNote: report.confidenceNote,
    strengths: [
      {
        insight: "You named a concrete moment instead of staying abstract.",
        evidence: report.moment,
      },
    ],
    tensionThemes: report.underneath.map((insight) => ({ insight, evidence: "First moment conversation" })),
    conflictPatterns: [
      {
        pattern: "First moment pattern",
        level: "moderate",
        confidence: "needs-more",
        description: report.underneath[0] ?? "A relationship pattern may be emerging.",
        evidence: report.moment,
      },
    ],
    repairCapacity: {
      level: "emerging",
      confidence: "needs-more",
      evidence: "The user completed a short coaching moment and requested a next step.",
      explanation: "This is enough for a useful first brief, but not enough for a complete relationship assessment.",
    },
    coachingPriorities: [
      { priority: "Use the next words in one short conversation.", why: report.nextWords },
      { priority: "Avoid escalation traps.", why: report.avoid.join(" ") },
    ],
    plan: {
      track1: [
        {
          day: "Today",
          action: "Try the next words",
          detail: report.nextWords,
          why: "A softer opening lowers defensiveness and keeps the moment specific.",
          type: "practice",
        },
      ],
      track2: [
        {
          day: "This week",
          action: "Notice whether the pattern repeats",
          detail: report.nextMove,
          why: "One moment is useful; recurrence tells us what belongs in the relationship map.",
          type: "reflection",
        },
      ],
      track3: [
        {
          day: "Next check-in",
          action: "Come back with what happened",
          detail: "Use HappyCouple to debrief the follow-up or invite your partner when ready.",
          why: "Follow-through turns a one-off recap into coaching over time.",
          type: "ai-session",
        },
      ],
    },
    dimensions: [
      {
        id: "conflict-navigation",
        name: "Conflict Navigation",
        score: 3,
        confidence: "needs-more",
        insight: report.underneath[0] ?? "More context is needed.",
        evidence: report.moment,
      },
    ],
    voiceScript: report.nextWords,
  };
}

export default function LandingPage() {
  const router = useRouter();
  const [focusMoment, setFocusMoment] = useState("");
  const [inlineSessionActive, setInlineSessionActive] = useState(false);
  const [guidanceReady, setGuidanceReady] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [agentMode, setAgentMode] = useState<AgentMode>("listening");
  const [voiceError, setVoiceError] = useState("");
  const [promptOffset, setPromptOffset] = useState(0);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>(STARTER_TRANSCRIPT);
  const [reportPreview, setReportPreview] = useState<MomentReportPreview | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportGenerationNote, setReportGenerationNote] = useState("");
  const sessionStartedRef = useRef(false);
  const firstUserMessageTrackedRef = useRef(false);
  const firstCoachResponseTrackedRef = useRef(false);
  const rotatingPrompts = Array.from({ length: 5 }, (_, index) =>
    PROMPT_ROTATION[(promptOffset + index) % PROMPT_ROTATION.length]
  );
  const visibleTranscript = showFullTranscript ? transcript : transcript.slice(-2);

  useEffect(() => {
    track.landingPageViewed();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPromptOffset((current) => (current + 1) % PROMPT_ROTATION.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      track.voiceSessionStarted({ source: "landing_inline" });
      setVoiceStatus("active");
      setAgentMode("speaking");
      setVoiceError("");
    },
    onDisconnect: () => {
      sessionStartedRef.current = false;
      setVoiceStatus("idle");
      setAgentMode("listening");
    },
    onMessage: (props) => {
      const text = props.message?.trim();
      if (!text) return;
      const nextMessage = {
        speaker: props.source === "ai" ? "HappyCouple" as const : "You" as const,
        text,
      };
      setTranscript((previous) => {
        if (nextMessage.speaker === "You" && !firstUserMessageTrackedRef.current) {
          firstUserMessageTrackedRef.current = true;
          track.firstUserMessageSent({ source: "landing_inline", message_count: previous.length + 1 });
        }
        if (nextMessage.speaker === "HappyCouple" && !firstCoachResponseTrackedRef.current) {
          firstCoachResponseTrackedRef.current = true;
          track.firstCoachResponseReceived({ source: "landing_inline", message_count: previous.length + 1 });
        }
        const nextTranscript = [...previous, nextMessage];
        if (nextMessage.speaker === "You" && shouldOfferReportFromUserMessage(text)) {
          track.endedByNaturalSummaryRequest({ source: "landing_inline", message_count: nextTranscript.length });
          window.setTimeout(() => { void completeMomentSession(nextTranscript, "natural_summary_request"); }, 400);
        }
        return nextTranscript;
      });
    },
    onError: (message) => {
      const errorText = typeof message === "string" ? message : "Voice connection failed. Try again.";
      track.voiceSessionFailed(errorText, { source: "landing_inline" });
      setVoiceError(errorText);
      setVoiceStatus("error");
      sessionStartedRef.current = false;
    },
    onModeChange: (props) => {
      setAgentMode(props.mode === "speaking" ? "speaking" : "listening");
    },
  });

  const startVoiceCapture = useCallback(async (momentOverride?: string, source = "pod") => {
    if (sessionStartedRef.current) return;
    track.startVoiceClicked(source);

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) {
      setInlineSessionActive(true);
      setVoiceStatus("error");
      setVoiceError("ElevenLabs agent ID is not configured.");
      return;
    }

    const trimmedMoment = (momentOverride ?? focusMoment).trim();
    setInlineSessionActive(true);
    setReportPreview(null);
    setReportGenerating(false);
    setReportGenerationNote("");
    setShowPlanPreview(false);
    setGuidanceReady(Boolean(trimmedMoment));
    setVoiceError("");
    setVoiceStatus("connecting");
    setTranscript(trimmedMoment ? [{ speaker: "You", text: trimmedMoment }] : []);
    setShowFullTranscript(false);
    firstUserMessageTrackedRef.current = Boolean(trimmedMoment);
    firstCoachResponseTrackedRef.current = false;
    if (trimmedMoment) {
      track.firstUserMessageSent({ source, message_count: 1, seeded_from_prompt: true });
    }
    sessionStartedRef.current = true;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId,
        connectionType: "websocket",
        overrides: {
          agent: {
            prompt: { prompt: getSystemPrompt(undefined, trimmedMoment || undefined) },
            firstMessage: getFirstMessageUndecided(trimmedMoment || undefined),
          },
        },
      } as Parameters<typeof conversation.startSession>[0]);
    } catch (error) {
      console.error("[ElevenLabs] Landing voice start failed:", error);
      const errorText = error instanceof Error ? error.message : "voice_start_failed";
      track.voiceSessionFailed(errorText, { source });
      setVoiceStatus("error");
      setVoiceError("Couldn’t connect to the voice coach. Check mic access and try again.");
      sessionStartedRef.current = false;
    }
  }, [conversation, focusMoment]);

  function stopVoiceCapture() {
    try {
      conversation.endSession();
    } catch {
      // Already closed.
    }
    sessionStartedRef.current = false;
    setVoiceStatus("idle");
    setAgentMode("listening");
  }

  function closeInlineSession() {
    stopVoiceCapture();
    setInlineSessionActive(false);
    setGuidanceReady(false);
    setVoiceError("");
    setTranscript(STARTER_TRANSCRIPT);
    setShowFullTranscript(false);
  }

  async function generateMomentReport(sourceTranscript: TranscriptMessage[], trigger: "button" | "natural_summary_request" = "button") {
    const fallbackReport = buildMomentReportPreview(sourceTranscript, focusMoment);
    track.reportGenerationStarted({
      source: "landing_inline",
      trigger,
      message_count: sourceTranscript.length,
    });

    try {
      const response = await fetch("/api/moment-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: sourceTranscript, focusMoment }),
      });

      if (!response.ok) {
        track.reportGenerationSucceeded({ source: "landing_inline", trigger, report_generation_mode: "fallback" });
        return fallbackReport;
      }

      const apiReport = (await response.json()) as MomentReportPreview;
      track.reportGenerationSucceeded({ source: "landing_inline", trigger, report_generation_mode: "llm" });
      return apiReport;
    } catch (error) {
      console.warn("Moment report API unavailable; using local fallback.", error);
      track.reportGenerationSucceeded({ source: "landing_inline", trigger, report_generation_mode: "fallback" });
      return fallbackReport;
    }
  }

  async function completeMomentSession(
    sourceTranscript = transcript,
    trigger: "button" | "natural_summary_request" = "button"
  ) {
    stopVoiceCapture();
    setInlineSessionActive(false);
    setGuidanceReady(false);
    setVoiceError("");
    setShowFullTranscript(false);
    setReportPreview(null);
    setReportGenerating(true);
    setReportGenerationNote("Reading the real transcript and preparing your first summary…");

    const report = await generateMomentReport(sourceTranscript, trigger);
    setReportPreview(report);
    track.reportViewed(undefined, { source: "landing_inline", report_generation_trigger: trigger });
    setReportGenerating(false);
    setReportGenerationNote("");
  }

  function saveReportAndSignUp() {
    if (!reportPreview) return;
    track.saveReportClicked({ source: "landing_inline" });
    const now = new Date().toISOString();
    saveSession({
      mode: "solo",
      sessionType: "initial",
      focusMoment: reportPreview.moment,
      startedAt: now,
      completedAt: now,
      transcript: transcript.map((message) => ({
        role: message.speaker === "HappyCouple" ? "agent" : "user",
        text: message.text,
        timestamp: now,
      })),
      synthesis: buildSynthesisFromMomentReport(reportPreview),
    });
    router.push("/auth/login?mode=signup&next=save-report");
  }

  function startMomentFlow(moment = focusMoment) {
    const trimmed = moment.trim();
    const params = trimmed ? `?moment=${encodeURIComponent(trimmed)}` : "";
    track.ctaClicked("bottom_moment_flow");
    track.startTextClicked("bottom_moment_flow");
    router.push(`/onboarding${params}`);
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* ═══════════════════════════════════ */}
      {/* HERO — Product demo layout          */}
      {/* ═══════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-72px)] px-5 pt-8 pb-0 overflow-hidden flex flex-col justify-between">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 34%, rgba(76,213,245,0.14) 0%, transparent 30%), radial-gradient(circle at 50% 42%, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "auto, 26px 26px",
          }}
        />

        <div
          className={`relative z-10 mx-auto w-full max-w-7xl flex-1 grid grid-cols-1 gap-6 items-start ${
            inlineSessionActive || showPlanPreview
              ? "lg:grid-cols-[300px_minmax(340px,1fr)_300px]"
              : "lg:grid-cols-1"
          }`}
        >
          <motion.aside
            className={`${inlineSessionActive ? "hidden lg:block opacity-100 translate-x-0" : "hidden opacity-0 -translate-x-6 pointer-events-none"} pt-16 transition-all duration-500`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono uppercase tracking-[0.16em] text-xs" style={{ color: "var(--text-muted)" }}>
                Transcript
              </div>
              {transcript.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setShowFullTranscript((value) => !value)}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent)" }}
                >
                  {showFullTranscript ? "Collapse" : `Expand (${transcript.length})`}
                </button>
              ) : null}
            </div>
            <div className={`${showFullTranscript ? "max-h-[42vh] overflow-y-auto pr-2" : ""} mt-5 space-y-4`}>
              {transcript.length === 0 ? (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  The latest exchange will appear here once the voice agent starts.
                </p>
              ) : null}
              {visibleTranscript.map((message, index) => (
                <motion.div
                  key={`${message.speaker}-${transcript.length}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="text-left"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: message.speaker === "HappyCouple" ? "var(--accent)" : "var(--text-muted)" }}>
                    {message.speaker}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {message.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.aside>

          <div className={`flex flex-col items-center text-center transition-all duration-700 ${inlineSessionActive || showPlanPreview ? "lg:col-start-2" : ""} ${inlineSessionActive ? "pt-16 lg:pt-28" : "pt-0 lg:pt-2"}`}>
            <motion.button
              type="button"
              onClick={() => startVoiceCapture(undefined, "pod")}
              whileTap={{ y: 12, scale: 0.985 }}
              className="group relative flex h-[220px] w-[220px] md:h-[252px] md:w-[252px] items-center justify-center rounded-[18px] outline-none transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(3,6,7,0.92)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: voiceStatus === "active" || voiceStatus === "connecting"
                  ? "0 0 0 1px rgba(76,213,245,0.34), 0 0 80px rgba(76,213,245,0.34)"
                  : "0 24px 90px rgba(0,0,0,0.42)",
              }}
              aria-label="Talk to your relationship coach"
            >
              <motion.div
                className="absolute inset-0 rounded-[18px] opacity-70"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.18) 2px, transparent 2px)",
                  backgroundSize: "24px 24px",
                }}
                animate={{ opacity: voiceStatus === "active" ? [0.35, 0.8, 0.35] : [0.45, 0.68, 0.45] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute left-1/2 top-[57%] h-5 w-40 -translate-x-1/2 rounded-full"
                style={{ background: "var(--accent)", filter: "blur(14px)" }}
                animate={{ scaleX: voiceStatus === "active" ? [0.8, 1.18, 0.8] : [0.75, 1, 0.75], opacity: [0.35, 0.95, 0.35] }}
                transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
              />
              <ListeningPod state={voiceStatus === "connecting" ? "thinking" : voiceStatus === "active" ? agentMode : guidanceReady ? "thinking" : "idle"} size="md" />
              <div
                className="absolute -right-8 md:-right-24 top-[34%] rounded-full px-4 py-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.16em] opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
              >
                {voiceStatus === "connecting" ? "Connecting" : voiceStatus === "active" ? agentMode === "speaking" ? "Coach speaking" : "Listening" : voiceStatus === "error" ? "Try again" : "Click to talk"}
              </div>
            </motion.button>

            {!inlineSessionActive ? (
              reportGenerating ? (
                <motion.div
                  className="mt-7 w-full max-w-2xl rounded-[26px] p-6 md:p-8 text-center"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 24px 90px rgba(0,0,0,0.28)" }}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
                  </div>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                    Building your first moment summary
                  </div>
                  <h1 className="mt-3 text-2xl md:text-4xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
                    Pulling out what actually came up.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {reportGenerationNote || "Reading the transcript, separating useful signals from unknowns, and writing a cautious first read."}
                  </p>
                </motion.div>
              ) : reportPreview ? (
                <motion.div
                  className="mt-7 w-full max-w-3xl rounded-[26px] p-5 md:p-7 text-left"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 24px 90px rgba(0,0,0,0.28)" }}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                        First moment summary
                      </div>
                      <h1 className="mt-3 text-2xl md:text-4xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
                        Save this as your first relationship report?
                      </h1>
                      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {reportPreview.confidenceNote}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setReportPreview(null); setReportGenerating(false); setReportGenerationNote(""); setTranscript(STARTER_TRANSCRIPT); }}
                      className="shrink-0 rounded-full px-3 py-2 text-xs transition-opacity hover:opacity-80"
                      style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      Start over
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl p-4 md:col-span-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>The moment</div>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{reportPreview.moment}</p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>What may be underneath</div>
                      <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {reportPreview.underneath.slice(0, 2).map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>What we do not know yet</div>
                      <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {reportPreview.unknowns.slice(0, 2).map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl p-4 md:col-span-2" style={{ background: "rgba(76,213,245,0.08)", border: "1px solid rgba(76,213,245,0.28)" }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Try saying this</div>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{reportPreview.nextWords}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={saveReportAndSignUp}
                      className="rounded-full px-5 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5"
                      style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                    >
                      Save my report
                    </button>
                    <button
                      type="button"
                      onClick={() => startVoiceCapture(undefined, "pod")}
                      className="rounded-full px-5 py-3 text-sm font-medium transition-opacity hover:opacity-80"
                      style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    >
                      Start another moment
                    </button>
                    <p className="text-xs leading-relaxed sm:ml-auto sm:max-w-xs" style={{ color: "var(--text-muted)" }}>
                      Create a private account to keep this summary, track whether the pattern repeats, and invite your partner when ready.
                    </p>
                  </div>
                </motion.div>
              ) : (
              <motion.div
                className="mt-7 max-w-5xl"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] mb-3"
                  style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--border)" }}
                >
                  Private relationship coaching, not therapy
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.03]" style={{ color: "var(--text-primary)" }}>
                  <span className="md:whitespace-nowrap">Handle your relationship better,</span>
                  <br />
                  one moment at a time.
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Talk through one real situation. Get clearer on what is underneath, what to say next, and what not to do.
                </p>
              </motion.div>
              )
            ) : (
              <motion.div
                className="mt-8 w-full max-w-xl lg:hidden rounded-2xl p-4 text-left"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                    Transcript
                  </div>
                  {transcript.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setShowFullTranscript((value) => !value)}
                      className="font-mono text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: "var(--accent)" }}
                    >
                      {showFullTranscript ? "Collapse" : "Expand"}
                    </button>
                  ) : null}
                </div>
                {transcript.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Latest exchange will appear here.</p>
                ) : null}
                <div className={showFullTranscript ? "max-h-[32vh] overflow-y-auto pr-1" : ""}>
                  {visibleTranscript.map((message, index) => (
                    <div key={`${message.speaker}-${transcript.length}-${index}`} className="mb-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: message.speaker === "HappyCouple" ? "var(--accent)" : "var(--text-muted)" }}>{message.speaker}</div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{message.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {!inlineSessionActive && !reportPreview && !reportGenerating ? (
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => startVoiceCapture(undefined, "pod")}
                className="rounded-full px-4 py-2.5 text-xs md:text-sm font-medium transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
              >
                Talk to your coach
              </button>
              <a
                href="#coaching-plan"
                onClick={() => { track.longTermPlanClicked(); }}
                className="rounded-full px-4 py-2.5 text-xs md:text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}
              >
                See a long-term coaching plan
              </a>
            </div>
            ) : null}

            {voiceError ? (
              <p className="mt-4 max-w-md text-sm" style={{ color: "#fca5a5" }}>
                {voiceError}
              </p>
            ) : null}

            {inlineSessionActive ? (
              <>
                <button
                  type="button"
                  onClick={closeInlineSession}
                  aria-label="Close conversation"
                  className="fixed right-5 top-[76px] z-30 flex h-10 w-10 items-center justify-center rounded-full text-lg transition-opacity hover:opacity-80"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border)", background: "var(--bg-elevated)" }}
                >
                  ×
                </button>
                <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                  {voiceStatus === "connecting" ? "Connecting to voice coach" : voiceStatus === "active" ? agentMode === "speaking" ? "Coach speaking" : "Listening" : voiceStatus === "error" ? "Voice connection failed" : "Voice session ready"}
                </div>
                <button
                  type="button"
                  onClick={() => { track.endAndSummarizeClicked({ source: "landing_inline", message_count: transcript.length }); void completeMomentSession(); }}
                  className="mt-4 rounded-full px-4 py-2.5 text-xs font-medium transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                >
                  End and summarize
                </button>
                <p className="mt-2 max-w-xs text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Use this when the conversation feels complete. The coach can also summarize if you ask for a recap.
                </p>
              </>
            ) : null}
          </div>

          <motion.aside
            className={`${inlineSessionActive || showPlanPreview ? "hidden lg:block opacity-100 translate-x-0" : "hidden opacity-0 translate-x-6 pointer-events-none"} lg:col-start-3 pt-16 transition-all duration-500`}
          >
            {inlineSessionActive ? (
              <>
                <div className="font-mono uppercase tracking-[0.16em] text-xs" style={{ color: "var(--text-muted)" }}>
                  Session map
                </div>
                <div className="mt-6 space-y-6">
                  {[
                    ["Presence", "Solo or together"],
                    ["Moment", "What happened"],
                    ["Underneath", "What may be driving it"],
                    ["Next words", "What to say or avoid"],
                  ].map(([name, label], index) => (
                    <div key={name} className="relative pl-5">
                      {index === 0 ? <div className="absolute left-0 top-0 h-12 w-px" style={{ background: "var(--accent)" }} /> : null}
                      <div className="font-mono text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-primary)" }}>
                        {name}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="font-mono uppercase tracking-[0.16em] text-xs" style={{ color: "var(--text-muted)" }}>
                  Coaching plan
                </div>
                <div className="mt-6 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Your relationship report
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      ["Pattern", "Defensiveness around chores"],
                      ["Repair", "Use softer startup"],
                      ["Next step", "Plan a 12-minute check-in"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "var(--border)" }}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>{label}</span>
                        <span className="text-sm text-right" style={{ color: "var(--accent)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {["Week 1", "Week 2", "Week 3"].map((week, index) => (
                      <div key={week} className="rounded-xl p-3 text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{week}</div>
                        <div className="mt-2 h-1 rounded-full" style={{ background: index === 0 ? "var(--accent)" : "var(--border)" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </div>

        {!inlineSessionActive && !reportPreview && !reportGenerating ? (
          <div className="relative z-10 mt-7 border-y" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-5">
              {rotatingPrompts.map((prompt, index) => (
                <button
                  key={`${prompt}-${index}`}
                  type="button"
                  onClick={() => {
                    track.promptChipClicked(prompt);
                    setFocusMoment(prompt);
                    startVoiceCapture(prompt, "prompt_chip");
                  }}
                  className="min-h-[58px] px-4 py-3 text-left sm:text-center text-[10px] md:text-xs transition-colors hover:bg-white/5 border-b sm:border-b-0 sm:border-r last:border-r-0"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  <span className="font-mono uppercase tracking-[0.12em]">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      {!inlineSessionActive ? (
        <>
          {/* ═══════════════════════════════════ */}
          {/* MOMENT FLOW                         */}
          {/* ═══════════════════════════════════ */}
          <section className="px-6 py-20 md:py-28">
            <div className="mx-auto max-w-6xl">
              <motion.div
                className="mb-12 max-w-3xl"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  First value
                </div>
                <h2 className="mt-3 text-3xl md:text-5xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                  Start with the conversation you need to have today.
                </h2>
                <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  HappyCouple is not a brochure, a quiz, or a therapy intake. It starts as a short coaching session for one real relationship moment.
                </p>
              </motion.div>

              <div className="grid gap-4 md:grid-cols-3">
                {MOMENT_STEPS.map((step, i) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.08, duration: 0.55 }}
                    className="rounded-[22px] p-6 md:p-7"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-4xl font-light" style={{ color: "var(--accent)" }}>{step.number}</span>
                      <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{step.detail}</span>
                    </div>
                    <h3 className="mt-6 text-lg font-medium" style={{ color: "var(--text-primary)" }}>{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* BROADER PRODUCT                     */}
          {/* ═══════════════════════════════════ */}
          <section id="coaching-plan" className="scroll-mt-24 px-6 py-20 md:py-28" style={{ background: "var(--bg-secondary)" }}>
            <div className="mx-auto max-w-6xl">
              <motion.div
                className="mb-12 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                    Beyond the first session
                  </div>
                  <h2 className="mt-3 text-3xl md:text-5xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                    From one hard moment to a clearer relationship.
                  </h2>
                </div>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  If the first conversation helps, HappyCouple turns those moments into reports, partner-safe check-ins, pattern memory, and a practical coaching plan over time.
                </p>
              </motion.div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {PRODUCT_STEPS.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="rounded-[22px] p-6"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>{step.eyebrow}</div>
                    <h3 className="mt-3 text-lg font-medium" style={{ color: "var(--text-primary)" }}>{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* TRUST                               */}
          {/* ═══════════════════════════════════ */}
          <section className="px-6 py-20 md:py-28">
            <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  Trust the container
                </div>
                <h2 className="mt-3 text-3xl md:text-5xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                  Coaching without turning your relationship into a case file.
                </h2>
              </motion.div>
              <div className="space-y-3">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="rounded-2xl p-5 text-sm leading-relaxed" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </section>

      {/* ═══════════════════════════════════ */}
      {/* BOTTOM CTA                          */}
      {/* ═══════════════════════════════════ */}
      <section
        className="px-6 py-24"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center">
              <ListeningPod state="idle" size="sm" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-light tracking-tight mt-6"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to handle this moment better?
            </h2>
            <p
              className="mt-4 mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Start with one real situation. Get useful guidance before committing to anything bigger.
            </p>
            <Button
              size="lg"
              onClick={() => startMomentFlow()}
            >
              Get help with this moment
            </Button>
            <p
              className="text-xs mt-6"
              style={{ color: "var(--text-muted)" }}
            >
              Self-guided coaching, not therapy. Does not diagnose conditions
              or replace professional care.
            </p>
          </motion.div>
        </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
