"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  role: "agent" | "user";
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 22,
  role,
  onComplete,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const prevTextRef = useRef(text);

  useEffect(() => {
    // If same text, skip animation
    if (text === prevTextRef.current && done) return;
    prevTextRef.current = text;
    setDisplayed("");
    setDone(false);

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete, done]);

  const isAgent = role === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[85%] ${isAgent ? "pr-8" : "pl-8"}`}
      >
        {/* Role label */}
        <span
          className="text-[10px] uppercase tracking-widest block mb-1.5"
          style={{
            color: isAgent ? "var(--accent)" : "var(--text-muted)",
            letterSpacing: "0.15em",
          }}
        >
          {isAgent ? "Guide" : "You"}
        </span>

        {/* Message text */}
        <p
          className="text-base leading-relaxed"
          style={{
            color: isAgent ? "var(--text-primary)" : "var(--text-secondary)",
            fontFamily: isAgent
              ? "var(--font-geist-sans), Georgia, serif"
              : "var(--font-geist-sans), system-ui, sans-serif",
            fontWeight: isAgent ? 300 : 400,
            fontSize: isAgent ? "1.05rem" : "0.95rem",
            letterSpacing: isAgent ? "0.01em" : "0",
            fontStyle: isAgent ? "normal" : "normal",
          }}
        >
          {displayed}
          {!done && (
            <motion.span
              className="inline-block w-[2px] h-[1.1em] ml-[1px] align-text-bottom"
              style={{ background: "var(--accent)" }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </p>
      </div>
    </motion.div>
  );
}
