"use client";

import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: {
    bg: "var(--accent)",
    color: "var(--bg-primary)",
    border: "none",
    hoverBg: "#d4a57a",
  },
  secondary: {
    bg: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    hoverBg: "var(--bg-elevated)",
  },
  ghost: {
    bg: "transparent",
    color: "var(--text-secondary)",
    border: "none",
    hoverBg: "var(--bg-elevated)",
  },
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
}: ButtonProps) {
  const style = variants[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-medium tracking-wide transition-colors cursor-pointer ${sizes[size]} ${className}`}
      style={{
        background: style.bg,
        color: style.color,
        border: style.border,
        opacity: disabled ? 0.4 : 1,
      }}
      whileHover={disabled ? {} : { scale: 1.02, background: style.hoverBg }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}
