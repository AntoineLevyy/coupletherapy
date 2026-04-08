"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ListeningPod } from "@/components/pod/ListeningPod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Speak openly",
    description:
      "Have a guided voice conversation with your AI coaching guide. Talk about what's been happening, how conflicts unfold, and what you need from each other. No typing — just talk.",
    detail: "~15 minutes",
  },
  {
    number: "02",
    title: "See your patterns",
    description:
      "The AI analyzes your conversation against decades of relationship research. It identifies conflict patterns, communication habits, and connection signals — with evidence from exactly what you said.",
    detail: "Instant analysis",
  },
  {
    number: "03",
    title: "Get your plan",
    description:
      "Receive a personalized coaching plan with daily practices and scheduled AI check-ins. Each recommendation explains why it targets your specific patterns and what the research says about why it works.",
    detail: "7-day cycle",
  },
  {
    number: "04",
    title: "Grow over time",
    description:
      "Track your progress across sessions. See how your patterns shift. Come back for State of the Union check-ins where your guide remembers everything and adapts to where you are now.",
    detail: "Ongoing coaching",
  },
];

const FEATURES = [
  {
    title: "Together or solo",
    description:
      "Both partners can reflect together in one session, or each can complete their own private reflection. Solo answers stay private — only synthesized themes are shared.",
  },
  {
    title: "Evidence-based insights",
    description:
      "Every observation cites what you actually said. Every recommendation explains why it works, grounded in peer-reviewed relationship science.",
  },
  {
    title: "Your guide remembers",
    description:
      "Each session builds on the last. Your coaching guide carries your full context — patterns, progress, and priorities — into every conversation.",
  },
  {
    title: "Private by design",
    description:
      "Individual responses are never shared with your partner. Combined reports show themes and overlap, never raw words.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* ═══════════════════════════════════ */}
      {/* HERO — Above the fold              */}
      {/* ═══════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Subtle background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, var(--accent-soft) 0%, transparent 50%)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <ListeningPod state="idle" size="md" />
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl font-light tracking-tight mt-8"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Couple Therapy
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl mt-4 max-w-lg leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            A voice-guided space to reflect on your relationship, understand
            your patterns, and build a plan — together or on your own.
          </motion.p>

          <motion.p
            className="text-xs mt-4 tracking-wide uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            Informed by decades of relationship science
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <Button size="lg" onClick={() => router.push("/onboarding")}>
              Begin Your Session — Free
            </Button>
          </motion.div>

          <motion.p
            className="text-xs mt-8 max-w-md leading-relaxed"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          >
            No account needed for your first session. If you are in crisis,
            contact{" "}
            <span style={{ color: "var(--accent)" }}>988</span> or{" "}
            <span style={{ color: "var(--accent)" }}>911</span>.
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4, y: [0, 8, 0] }}
            transition={{
              opacity: { delay: 1.5 },
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* HOW IT WORKS — Below the fold       */}
      {/* ═══════════════════════════════════ */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2
              className="text-3xl md:text-4xl font-light tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              How it works
            </h2>
            <p
              className="mt-4 text-lg max-w-lg mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              A structured process grounded in what the research says actually
              helps couples move forward.
            </p>
          </motion.div>

          {/* Process Steps */}
          <div className="space-y-6">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <div
                  className="flex gap-6 md:gap-8 p-6 md:p-8 rounded-2xl"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex-shrink-0">
                    <span
                      className="text-3xl md:text-4xl font-light"
                      style={{ color: "var(--accent)" }}
                    >
                      {step.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-lg md:text-xl font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {step.title}
                      </h3>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                        }}
                      >
                        {step.detail}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FEATURES                            */}
      {/* ═══════════════════════════════════ */}
      <section className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-light tracking-tight text-center mb-16"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            Built different
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <Card>
                  <h3
                    className="text-base font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* SCIENCE SECTION                     */}
      {/* ═══════════════════════════════════ */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2
              className="text-3xl md:text-4xl font-light tracking-tight mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              The science behind it
            </h2>
            <p
              className="text-sm leading-relaxed max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Our approach is grounded in over four decades of peer-reviewed
              relationship research — large-scale longitudinal studies that
              tracked thousands of couples to identify the specific
              communication patterns that predict whether relationships thrive
              or deteriorate. This research identified destructive conflict
              signals with over 90% accuracy — and the specific practices
              that help couples reverse them. We use these findings to guide
              every conversation, every insight, and every recommendation.
            </p>
            <div
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { number: "40+", label: "Years of research" },
                { number: "94%", label: "Prediction accuracy" },
                { number: "69%", label: "Problems are perpetual" },
                { number: "5:1", label: "Positive ratio that works" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-2xl md:text-3xl font-light"
                    style={{ color: "var(--accent)" }}
                  >
                    {stat.number}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
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
            <ListeningPod state="idle" size="sm" />
            <h2
              className="text-2xl md:text-3xl font-light tracking-tight mt-6"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to understand your patterns?
            </h2>
            <p
              className="mt-4 mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Your first session is free. No account needed.
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/onboarding")}
            >
              Begin Your Session
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
    </main>
  );
}
