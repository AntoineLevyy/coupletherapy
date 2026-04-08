"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const router = useRouter();
  const { user, loading } = useAuth();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(10, 10, 12, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2.5 cursor-pointer"
      >
        <div
          className="w-7 h-7 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, var(--bg-surface) 0%, var(--bg-secondary) 60%, var(--bg-primary) 100%)`,
            boxShadow: "0 0 12px var(--accent-soft)",
          }}
        />
        <span
          className="text-sm font-light tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Couple Therapy
        </span>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="w-16" />
        ) : user ? (
          <>
            <button
              onClick={() => router.push("/plan")}
              className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Plan
            </button>
            <button
              onClick={() => router.push("/history")}
              className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              History
            </button>
            <button
              onClick={() => router.push("/history")}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              {user.email?.charAt(0).toUpperCase() || "?"}
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/auth/login")}
            className="text-xs px-4 py-2 rounded-full cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
