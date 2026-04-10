"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { ListeningPod, type PodState } from "@/components/pod/ListeningPod";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { Button } from "@/components/ui/Button";
import { CRISIS_RESOURCES } from "@/lib/framework";
import { loadSession, saveSession, type SynthesisData } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { getSystemPrompt, FIRST_MESSAGE_TOGETHER, FIRST_MESSAGE_SOLO } from "@/lib/system-prompt";
import { buildPriorContext, getStateOfUnionPrompt, getCheckInPrompt } from "@/lib/session-prompts";

type SessionPhase = "connecting" | "active" | "crisis" | "ending" | "complete";

export default function SessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SessionPhase>("connecting");
  const [podState, setPodState] = useState<PodState>("idle");
  const [transcript, setTranscript] = useState<
    { role: "user" | "agent"; text: string }[]
  >([]);
  const [elapsed, setElapsed] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const sessionStarted = useRef(false);
  const phaseRef = useRef<SessionPhase>("connecting");
  const userEndedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasReceivedMessage = useRef(false);
  const connectedAt = useRef<number | null>(null);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      connectedAt.current = Date.now();
      setPhase("active");
      setPodState("speaking");
      setConnectionError(null);
    },
    onDisconnect: () => {
      const sessionDuration = connectedAt.current ? (Date.now() - connectedAt.current) / 1000 : 0;
      console.log("[ElevenLabs] Disconnected, userEnded:", userEndedRef.current, "phase:", phaseRef.current, "duration:", sessionDuration, "hadMessages:", hasReceivedMessage.current);

      if (userEndedRef.current) {
        // User explicitly ended — go to ending screen
        setPhase("ending");
        setPodState("idle");
      } else if (phaseRef.current === "active" && hasReceivedMessage.current && sessionDuration > 10) {
        // Real session that ran for a while — unexpected disconnect
        console.log("[ElevenLabs] Unexpected disconnect during active session");
        setPodState("idle");
        setPhase("ending");
      } else if (phaseRef.current === "active" || phaseRef.current === "connecting") {
        // Connection failed or dropped almost immediately — show error, not ending screen
        console.log("[ElevenLabs] Connection failed or dropped immediately");
        setConnectionError("Connection lost. This may be a quota or network issue. Please try again.");
        setPhase("connecting");
        setPodState("idle");
        sessionStarted.current = false;
        connectedAt.current = null;
      }
    },
    onMessage: (props) => {
      console.log("[ElevenLabs] Message:", props);
      hasReceivedMessage.current = true;
      const text = props.message;
      const role = props.source === "ai" ? "agent" as const : "user" as const;
      if (text) {
        setTranscript((prev) => [...prev, { role, text }]);
      }
    },
    onError: (message) => {
      console.error("[ElevenLabs] Error:", message);
      const errorStr = typeof message === "string" ? message : "Connection error";
      setConnectionError(errorStr);
      // If we haven't properly connected yet, reset to connecting so user sees error
      if (!hasReceivedMessage.current) {
        setPhase("connecting");
        setPodState("idle");
        sessionStarted.current = false;
      }
    },
    onModeChange: (prop) => {
      console.log("[ElevenLabs] Mode:", prop.mode);
      if (phaseRef.current === "active") {
        setPodState(prop.mode === "speaking" ? "speaking" : "listening");
      }
    },
  });

  // Check for valid session — must exist and not already be completed
  useEffect(() => {
    const session = loadSession();
    console.log("[Session] Loaded session:", session?.mode, "completed:", !!session?.completedAt, "hasSynthesis:", !!session?.synthesis);
    if (!session) {
      console.log("[Session] No session found, redirecting to onboarding");
      router.push("/onboarding");
    } else if (session.completedAt || session.synthesis) {
      // This is a completed session — redirect to dashboard instead of restarting
      console.log("[Session] Session already completed, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [router]);

  const SESSION_LIMIT = 15 * 60; // 15 minutes in seconds

  // Timer + auto-end at 15 minutes
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= SESSION_LIMIT) {
          userEndedRef.current = true;
          setPhase("ending");
          try {
            conversation.endSession();
          } catch {}
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, conversation]);

  const { user } = useAuth();

  // Start the conversation with full context
  const startConversation = useCallback(async () => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    setConnectionError(null);

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) {
      setConnectionError("Agent ID not configured.");
      sessionStarted.current = false;
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setConnectionError("Microphone access is required. Please allow microphone access and try again.");
      sessionStarted.current = false;
      return;
    }

    // Load session config
    const session = loadSession();
    const mode = session?.mode || "together";
    const sessionType = session?.sessionType || "initial";

    // Fetch prior context scoped to the couple (both partners' syntheses)
    let priorSyntheses: SynthesisData[] = [];
    if (user) {
      try {
        const supabase = createClient();

        // Find the user's couple
        const { data: coupleData } = await supabase
          .from("couples")
          .select("id")
          .eq("status", "active")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .limit(1)
          .single();

        if (coupleData) {
          // Fetch all syntheses for this couple (both partners' individual + combined)
          // RLS ensures we only see what we're allowed to see
          const { data } = await supabase
            .from("syntheses")
            .select("data, synthesis_type")
            .eq("couple_id", coupleData.id)
            .order("created_at", { ascending: true });

          if (data && data.length > 0) {
            priorSyntheses = data.map((row) => row.data as SynthesisData);
          }
        } else {
          // No couple — just fetch this user's own syntheses
          const { data } = await supabase
            .from("syntheses")
            .select("data")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

          if (data && data.length > 0) {
            priorSyntheses = data.map((row) => row.data as SynthesisData);
          }
        }
      } catch (err) {
        console.warn("[Context] Failed to load prior sessions:", err);
      }
    }

    // Build the appropriate prompt based on session type and history
    let systemPrompt: string;
    let firstMessage: string;
    const priorContext = buildPriorContext(priorSyntheses);

    if (sessionType === "state-of-union") {
      systemPrompt = getStateOfUnionPrompt(priorContext);
      firstMessage = priorSyntheses.length > 0
        ? "Welcome back. This is your State of the Union check-in. We'll go through four parts: appreciations, what's working, one concern each, and a connection request. Let's start with the good stuff — what's something your partner did this week that you appreciated?"
        : "Welcome to your State of the Union check-in. We'll go through four parts together: appreciations, what's working, one concern, and a connection request. Let's start — what's something you appreciated about your partner recently?";
    } else if (sessionType === "check-in") {
      systemPrompt = getCheckInPrompt(priorContext);
      firstMessage = "Hey, welcome back. I've been looking forward to checking in with you. How has the week been since we last talked? Were you able to try any of the things from your plan?";
    } else {
      // Initial or ad-hoc session — differentiate Together vs Solo
      const normalizedMode: "together" | "solo" = mode === "together" ? "together" : "solo";
      systemPrompt = getSystemPrompt(normalizedMode);
      if (priorSyntheses.length > 0) {
        // Returning user — inject context into the base prompt
        systemPrompt += `\n\n${priorContext}`;
        firstMessage = normalizedMode === "together"
          ? "Welcome back, both of you. I have context from our previous conversations, so we can build on where we left off. What's been happening since we last spoke?"
          : "Welcome back. I have context from our previous conversations, so we can pick up where things are. What's been on your mind since we last spoke?";
      } else {
        firstMessage = normalizedMode === "together" ? FIRST_MESSAGE_TOGETHER : FIRST_MESSAGE_SOLO;
      }
    }

    try {
      console.log("[ElevenLabs] Starting session, type:", sessionType, "prior sessions:", priorSyntheses.length);
      console.log("[ElevenLabs] Agent ID:", agentId);
      console.log("[ElevenLabs] Prompt length:", systemPrompt.length, "chars");

      // Start with overrides for returning users, basic connection for first-timers
      const sessionConfig: Record<string, unknown> = {
        agentId,
        connectionType: "websocket" as const,
      };

      // Only add overrides if we have context to inject
      if (priorSyntheses.length > 0 || sessionType !== "initial") {
        sessionConfig.overrides = {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        };
      }

      conversation.startSession(sessionConfig as Parameters<typeof conversation.startSession>[0]);
    } catch (err) {
      console.error("[ElevenLabs] Start failed:", err);
      setConnectionError("Failed to connect. Please try again.");
      sessionStarted.current = false;
    }
  }, [conversation, user]);

  // Auto-start on mount
  useEffect(() => {
    if (phase === "connecting" && !sessionStarted.current) {
      console.log("[Session] Auto-starting conversation in 500ms");
      const timer = setTimeout(startConversation, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, startConversation]);

  // User explicitly ends the session
  function handleUserEnd() {
    userEndedRef.current = true;
    setPhase("ending");
    try {
      conversation.endSession();
    } catch {
      // already ended
    }
  }

  // Navigate to dashboard with transcript
  const handleEndSession = useCallback(() => {
    userEndedRef.current = true;
    try {
      conversation.endSession();
    } catch {
      // Session may already be ended
    }

    const session = loadSession();
    if (session) {
      saveSession({
        ...session,
        completedAt: new Date().toISOString(),
        transcript: transcript.map((t) => ({
          ...t,
          timestamp: new Date().toISOString(),
        })),
        // synthesis will be generated on the dashboard page via API
      });
    }
    router.push("/dashboard");
  }, [conversation, transcript, router]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [transcript]);

  const remaining = Math.max(0, SESSION_LIMIT - elapsed);
  const isLowTime = remaining <= 120; // last 2 minutes

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, var(--accent-soft) 0%, transparent 60%)`,
        }}
      />

      {/* Top bar — sits below the fixed header */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: isLowTime && phase === "active" ? "var(--warning)" : "var(--text-secondary)" }}
          >
            {phase === "active" && `${formatTime(remaining)} remaining`}
            {phase === "connecting" && "Connecting..."}
            {phase === "ending" && "Wrapping up..."}
            {phase === "complete" && "Session complete"}
          </span>
          {phase === "active" && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--success)" }}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            style={{
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              background: showTranscript ? "var(--bg-elevated)" : "transparent",
            }}
          >
            {showTranscript ? "Hide" : "Show"} transcript
          </button>
          {phase === "active" && (
            <Button variant="ghost" size="sm" onClick={handleUserEnd}>
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-start justify-center px-6 md:px-12 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Connecting state */}
          {phase === "connecting" && (
            <motion.div
              key="connecting"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ListeningPod state="thinking" size="lg" />
              <p style={{ color: "var(--text-secondary)" }}>
                {connectionError || "Setting up your session..."}
              </p>
              {connectionError && (
                <Button
                  onClick={() => {
                    setConnectionError(null);
                    sessionStarted.current = false;
                    startConversation();
                  }}
                >
                  Try Again
                </Button>
              )}
            </motion.div>
          )}

          {/* Active session */}
          {(phase === "active" || phase === "ending") && (
            <motion.div
              key="active"
              className="flex flex-col md:flex-row items-stretch gap-8 w-full max-w-5xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left: conversation text — newest at top */}
              <div
                ref={scrollRef}
                className="flex-1 w-full md:order-1 order-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2"
              >
                <div className="max-w-lg py-4">
                  {transcript.length > 0 && (
                    <TypewriterText
                      key={`latest-${transcript.length}`}
                      text={transcript[transcript.length - 1].text}
                      role={transcript[transcript.length - 1].role}
                      speed={transcript[transcript.length - 1].role === "agent" ? 18 : 8}
                    />
                  )}

                  {/* Listening indicator */}
                  {podState === "listening" && phase === "active" && transcript.length > 0 && (
                    <motion.div
                      className="flex items-center gap-2 mt-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <motion.div
                        className="flex gap-1"
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                      </motion.div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Listening
                      </span>
                    </motion.div>
                  )}
                </div>

                {phase === "ending" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <Button size="lg" onClick={handleEndSession}>
                      View Your Coaching Plan
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Right: pod */}
              <div className="flex-shrink-0 md:order-2 order-1 md:sticky md:top-24">
                <ListeningPod state={podState} size="lg" />
              </div>
            </motion.div>
          )}

          {/* Crisis state */}
          {phase === "crisis" && (
            <motion.div
              key="crisis"
              className="flex flex-col items-center gap-6 max-w-lg text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: "var(--danger)",
                  color: "var(--bg-primary)",
                }}
              >
                !
              </div>
              <h2
                className="text-xl font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Your safety comes first
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                What you&apos;ve described goes beyond what this coaching tool can
                help with. Please reach out to a professional who can support
                you right now.
              </p>
              <div className="w-full space-y-3">
                {CRISIS_RESOURCES.map((resource) => (
                  <div
                    key={resource.name}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {resource.name}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {resource.contact}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transcript panel */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-80 md:w-96 z-20 overflow-y-auto p-6"
            style={{
              background: "var(--bg-secondary)",
              borderLeft: "1px solid var(--border)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Transcript
              </h3>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-sm cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {transcript.map((entry, i) => (
                <div key={i} className="text-sm">
                  <span
                    className="text-xs uppercase tracking-wider block mb-1"
                    style={{
                      color:
                        entry.role === "agent"
                          ? "var(--accent)"
                          : "var(--text-muted)",
                    }}
                  >
                    {entry.role === "agent" ? "Guide" : "You"}
                  </span>
                  <p style={{ color: "var(--text-secondary)" }}>
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
