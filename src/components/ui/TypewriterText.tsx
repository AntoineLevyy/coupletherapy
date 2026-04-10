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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${isAgent ? "pr-12" : "pl-12"}`}>
        {/* Role label */}
        <span
          className="text-[9px] uppercase tracking-widest block mb-1"
          style={{
            color: isAgent ? "var(--accent)" : "var(--text-muted)",
            letterSpacing: "0.15em",
            opacity: 0.7,
          }}
        >
          {isAgent ? "Guide" : "You"}
        </span>

        {/* Message text */}
        <p
          className="leading-relaxed"
          style={{
            color: isAgent ? "var(--text-secondary)" : "var(--text-muted)",
            fontWeight: 300,
            fontSize: isAgent ? "0.85rem" : "0.8rem",
            letterSpacing: "0.01em",
            lineHeight: 1.7,
          }}
        >
          {displayed}
          {!done && (
            <motion.span
              className="inline-block w-[1.5px] h-[0.9em] ml-[1px] align-text-bottom"
              style={{ background: "var(--accent)", opacity: 0.6 }}
              animate={{ opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </p>
      </div>
    </motion.div>
  );
}
