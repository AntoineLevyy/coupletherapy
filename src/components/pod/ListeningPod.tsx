"use client";

import { motion, type Variants } from "framer-motion";

export type PodState = "idle" | "listening" | "speaking" | "thinking";

interface ListeningPodProps {
  state: PodState;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { container: 120, orb: 80 },
  md: { container: 240, orb: 160 },
  lg: { container: 360, orb: 240 },
};

const orbVariants: Variants = {
  idle: {
    scale: [1, 1.015, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
  listening: {
    scale: [1, 1.04, 0.97, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
  speaking: {
    scale: [1, 1.06, 0.95, 1.04, 0.97, 1],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
  },
  thinking: {
    scale: [1, 1.02, 1],
    rotate: [0, 1, -1, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const glowVariants: Variants = {
  idle: {
    opacity: [0.15, 0.25, 0.15],
    scale: [1, 1.05, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
  listening: {
    opacity: [0.2, 0.45, 0.2],
    scale: [1, 1.15, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
  speaking: {
    opacity: [0.25, 0.55, 0.25],
    scale: [1, 1.2, 0.95, 1.15, 1],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
  },
  thinking: {
    opacity: [0.2, 0.35, 0.2],
    scale: [1, 1.08, 1],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const ringVariants: Variants = {
  idle: { opacity: 0, scale: 0.8 },
  listening: {
    opacity: [0, 0.3, 0],
    scale: [0.9, 1.3, 1.5],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeOut" as const },
  },
  speaking: {
    opacity: [0, 0.4, 0],
    scale: [0.9, 1.25, 1.5],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeOut" as const },
  },
  thinking: {
    opacity: [0, 0.15, 0],
    scale: [0.95, 1.15, 1.3],
    transition: { duration: 3, repeat: Infinity, ease: "easeOut" as const },
  },
};

export function ListeningPod({ state, size = "lg" }: ListeningPodProps) {
  const dims = sizeMap[size];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dims.container, height: dims.container }}
    >
      {/* Outer pulse ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dims.orb * 1.6,
          height: dims.orb * 1.6,
          border: "1px solid var(--accent)",
        }}
        variants={ringVariants}
        animate={state}
      />

      {/* Second pulse ring (offset timing) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dims.orb * 1.4,
          height: dims.orb * 1.4,
          border: "1px solid var(--accent)",
        }}
        variants={ringVariants}
        animate={state}
        transition={{ delay: 0.5 }}
      />

      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dims.orb * 1.8,
          height: dims.orb * 1.8,
          background: `radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)`,
          filter: "blur(30px)",
        }}
        variants={glowVariants}
        animate={state}
      />

      {/* Main orb */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: dims.orb,
          height: dims.orb,
          background: `radial-gradient(circle at 35% 35%, var(--bg-surface) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)`,
          boxShadow: `
            inset 0 1px 2px rgba(255,255,255,0.05),
            inset 0 -4px 12px rgba(0,0,0,0.4),
            0 0 40px var(--accent-soft),
            0 0 80px var(--accent-soft)
          `,
        }}
        variants={orbVariants}
        animate={state}
      >
        {/* Inner highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: "15%",
            left: "20%",
            width: "30%",
            height: "25%",
            background: `radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 100%)`,
            filter: "blur(8px)",
          }}
        />

        {/* Accent rim light */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 180deg, transparent 0%, var(--accent-soft) 30%, transparent 60%)`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: state === "speaking" ? 3 : 8,
            repeat: Infinity,
            ease: "linear" as const,
          }}
        />
      </motion.div>

      {/* State indicator text */}
      <motion.div
        className="absolute text-xs tracking-widest uppercase"
        style={{
          bottom: size === "lg" ? 20 : size === "md" ? 10 : 0,
          color: "var(--text-muted)",
          letterSpacing: "0.2em",
        }}
        animate={{ opacity: state === "idle" ? 0 : 0.6 }}
      >
        {state === "listening" && "listening"}
        {state === "speaking" && "speaking"}
        {state === "thinking" && "thinking"}
      </motion.div>
    </div>
  );
}
