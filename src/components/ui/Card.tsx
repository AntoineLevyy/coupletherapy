"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 transition-all duration-300 ${
        hover ? "cursor-pointer hover:border-[var(--accent)] hover:shadow-[0_0_30px_var(--accent-soft)]" : ""
      } ${className}`}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}
