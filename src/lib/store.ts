/**
 * Simple client-side state management for the prototype.
 * Uses localStorage for persistence across page navigations.
 */

import type { SessionMode } from "./framework";

export interface SessionData {
  mode: SessionMode;
  sessionType?: string;
  startedAt: string;
  completedAt?: string;
  transcript: TranscriptEntry[];
  synthesis?: SynthesisData;
}

export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

export interface SynthesisData {
  summary: string;
  confidenceNote: string; // framing this as a first look
  strengths: EvidencedInsight[];
  tensionThemes: EvidencedInsight[];
  conflictPatterns: ConflictPatternScore[];
  repairCapacity: {
    level: "emerging" | "moderate" | "strong";
    confidence: "clear" | "emerging" | "needs-more";
    evidence: string;
    explanation: string;
  };
  coachingPriorities: CoachingPriority[];
  plan: PersonalizedPlan;
  dimensions: DimensionScore[];
  voiceScript: string;
}

export interface EvidencedInsight {
  insight: string;
  evidence: string;
}

export interface ConflictPatternScore {
  pattern: string;
  level: "low" | "moderate" | "elevated";
  confidence: "clear" | "emerging" | "needs-more";
  description: string;
  evidence: string;
}

export interface DimensionScore {
  id: string;
  name: string;
  score: number; // 1-5
  confidence: "clear" | "emerging" | "needs-more";
  insight: string;
  evidence: string;
}

export interface CoachingPriority {
  priority: string;
  why: string;
}

export interface PersonalizedPlan {
  track1: PlanItem[]; // Days 1-3: immediate practice targeting #1 pattern
  track2: PlanItem[]; // Days 4-7: connection building
  track3: PlanItem[]; // AI sessions woven in
}

export interface PlanItem {
  day: string;
  action: string;
  detail: string;
  why: string;
  type: "exercise" | "practice" | "ai-session" | "reflection";
}

const STORAGE_KEY = "couple-therapy-session";

export function saveSession(data: SessionData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
