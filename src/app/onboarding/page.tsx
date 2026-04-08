"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SESSION_MODES, type SessionMode } from "@/lib/framework";
import { saveSession } from "@/lib/store";
import { ListeningPod } from "@/components/pod/ListeningPod";

type Step = "disclaimer" | "mode";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("disclaimer");
  const [accepted, setAccepted] = useState(false);

  function handleModeSelect(mode: SessionMode) {
    saveSession({
      mode,
      startedAt: new Date().toISOString(),
      transcript: [],
    });
    router.push("/session");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        {step === "disclaimer" && (
          <motion.div
            key="disclaimer"
            className="max-w-xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-8">
              <ListeningPod state="idle" size="sm" />
            </div>

            <h1
              className="text-2xl md:text-3xl font-light text-center mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Before we begin
            </h1>
            <p
              className="text-center mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Please read and acknowledge the following.
            </p>

            <Card>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>This is not therapy.</strong>{" "}
                  Couple Therapy is an AI-powered relationship coaching and education tool.
                  It helps you reflect on patterns, build communication skills, and create
                  actionable plans — informed by peer-reviewed relationship science.
                </p>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>You are speaking with AI.</strong>{" "}
                  Your guide is an artificial intelligence, not a human therapist, counselor,
                  or mental health professional. This tool does not diagnose conditions,
                  provide clinical assessments, or offer medical advice.
                </p>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>Not a substitute for professional care.</strong>{" "}
                  If you or your partner are experiencing domestic violence, abuse, active
                  addiction, suicidal thoughts, or a mental health crisis, please seek
                  immediate professional help.
                </p>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>Privacy.</strong>{" "}
                  In solo mode, your individual answers remain private. Only synthesized
                  themes are shared — never your exact words. Voice data is processed in
                  real-time and not permanently stored in this prototype.
                </p>

                <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Crisis resources: <strong>911</strong> (Emergency) •{" "}
                    <strong>988</strong> (Suicide & Crisis Lifeline) •{" "}
                    <strong>1-800-799-7233</strong> (Domestic Violence Hotline) •{" "}
                    Text <strong>HOME to 741741</strong> (Crisis Text Line)
                  </p>
                </div>
              </div>
            </Card>

            <div className="mt-6 flex items-start gap-3">
              <input
                type="checkbox"
                id="accept"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
              />
              <label
                htmlFor="accept"
                className="text-sm cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                I understand this is an AI coaching tool, not therapy. I acknowledge the
                limitations described above.
              </label>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                disabled={!accepted}
                onClick={() => setStep("mode")}
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === "mode" && (
          <motion.div
            key="mode"
            className="max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1
              className="text-2xl md:text-3xl font-light text-center mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              How would you like to do this?
            </h1>
            <p
              className="text-center mb-10"
              style={{ color: "var(--text-secondary)" }}
            >
              Choose the mode that feels right for where you are.
            </p>

            <div className="grid gap-4 md:grid-cols-2 max-w-xl mx-auto">
              {SESSION_MODES.map((mode) => (
                <Card
                  key={mode.id}
                  hover
                  onClick={() => handleModeSelect(mode.id)}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {mode.icon === "together" ? "◎" : "○"}
                    </div>
                    <h3
                      className="text-lg font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {mode.name}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {mode.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Button variant="ghost" onClick={() => setStep("disclaimer")}>
                ← Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
