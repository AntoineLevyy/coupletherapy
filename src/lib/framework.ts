/**
 * Branded Framework — Our own terminology for relationship science concepts.
 * Inspired by peer-reviewed research including work by Drs. John and Julie Gottman.
 * We do NOT use trademarked Gottman Institute terms.
 */

// ── Our Framework: "The Relationship Architecture" ──

export const FRAMEWORK_NAME = "The Relationship Architecture";

// Gottman's "Sound Relationship House" → Our "Relationship Architecture" levels
export const ARCHITECTURE_LEVELS = [
  {
    level: 1,
    name: "Inner World Awareness",
    description: "How well you know your partner's inner life — their worries, joys, dreams, and daily experiences.",
    gottmanEquivalent: "Love Maps",
  },
  {
    level: 2,
    name: "Warmth & Regard",
    description: "The presence of genuine respect, appreciation, and affection between partners.",
    gottmanEquivalent: "Fondness & Admiration",
  },
  {
    level: 3,
    name: "Responsiveness",
    description: "How often and how well you respond to your partner's bids for connection.",
    gottmanEquivalent: "Turning Toward",
  },
  {
    level: 4,
    name: "Positive Lens",
    description: "Whether you interpret your partner's actions with goodwill or suspicion.",
    gottmanEquivalent: "Positive Sentiment Override",
  },
  {
    level: 5,
    name: "Conflict Navigation",
    description: "How you manage disagreements — escalation, de-escalation, and resolution patterns.",
    gottmanEquivalent: "Manage Conflict",
  },
  {
    level: 6,
    name: "Dream Honoring",
    description: "Whether each partner's individual aspirations and life dreams feel supported.",
    gottmanEquivalent: "Make Life Dreams Come True",
  },
  {
    level: 7,
    name: "Shared Story",
    description: "The rituals, roles, goals, and meaning you've built together as a couple.",
    gottmanEquivalent: "Create Shared Meaning",
  },
] as const;

// Gottman's "Four Horsemen" → Our "Four Conflict Signals"
export const CONFLICT_SIGNALS = [
  {
    name: "Blame Pattern",
    description: "Attacking your partner's character instead of addressing a specific behavior.",
    indicators: ["'You always...'", "'You never...'", "Global character attacks"],
    antidote: "Gentle Opening",
    antidoteDescription: "Start with 'I feel... about... and I need...' instead of 'You are...'",
    gottmanEquivalent: "Criticism",
  },
  {
    name: "Superiority Pattern",
    description: "Speaking from a position of moral superiority — sarcasm, mockery, eye-rolling, dismissiveness.",
    indicators: ["Sarcasm", "Mockery", "Eye-rolling", "Name-calling", "Hostile humor"],
    antidote: "Appreciation Practice",
    antidoteDescription: "Regularly express genuine respect and appreciation for your partner.",
    gottmanEquivalent: "Contempt",
  },
  {
    name: "Shield Pattern",
    description: "Deflecting responsibility — making excuses, counter-attacking, or playing the victim.",
    indicators: ["'It's not my fault'", "Counter-complaints", "'Yes, but...'", "Victim stance"],
    antidote: "Ownership",
    antidoteDescription: "Accept responsibility for even a small part of the issue.",
    gottmanEquivalent: "Defensiveness",
  },
  {
    name: "Withdrawal Pattern",
    description: "Shutting down, going silent, or emotionally leaving the conversation.",
    indicators: ["Silent treatment", "Disengagement", "Leaving the room", "Monosyllabic responses"],
    antidote: "Intentional Pause",
    antidoteDescription: "Name the overwhelm, take a 20-minute break to self-soothe, then return.",
    gottmanEquivalent: "Stonewalling",
  },
] as const;

// Dashboard scoring dimensions
export const COACHING_DIMENSIONS = [
  {
    id: "conflict_escalation",
    name: "Conflict Intensity",
    description: "How quickly and strongly disagreements escalate.",
    low: "Disagreements stay contained and manageable.",
    high: "Conflicts tend to escalate quickly and feel overwhelming.",
  },
  {
    id: "emotional_attunement",
    name: "Emotional Attunement",
    description: "How well partners tune into each other's emotional states.",
    low: "Partners often feel unseen or misunderstood.",
    high: "Partners feel emotionally seen and understood.",
  },
  {
    id: "repair_capacity",
    name: "Repair Capacity",
    description: "The ability to reconnect after conflict or disconnection.",
    low: "After conflict, distance tends to linger.",
    high: "Partners find their way back to each other relatively quickly.",
  },
  {
    id: "trust_safety",
    name: "Trust & Safety",
    description: "The foundation of psychological safety in the relationship.",
    low: "Vulnerability feels risky in this relationship.",
    high: "Both partners feel safe being open and vulnerable.",
  },
  {
    id: "communication_clarity",
    name: "Communication Clarity",
    description: "How clearly needs, feelings, and boundaries are expressed.",
    low: "Important things often go unsaid or come out sideways.",
    high: "Partners express their needs and feelings directly and kindly.",
  },
  {
    id: "shared_direction",
    name: "Shared Direction",
    description: "Alignment on values, goals, and the life you're building together.",
    low: "Partners feel like they're heading in different directions.",
    high: "There's a clear sense of shared purpose and direction.",
  },
] as const;

// Session modes
export type SessionMode = "together" | "solo";

export const SESSION_MODES = [
  {
    id: "together" as SessionMode,
    name: "Together",
    description: "Both of you, one conversation. Your guide will invite both perspectives.",
    icon: "together",
  },
  {
    id: "solo" as SessionMode,
    name: "Solo",
    description: "Just you, privately. Go deeper on your own experience. Your answers are never shared with your partner.",
    icon: "solo",
  },
] as const;

// Crisis resources
export const CRISIS_RESOURCES = [
  { name: "Emergency Services", contact: "911", type: "emergency" },
  { name: "Suicide & Crisis Lifeline", contact: "988", type: "crisis" },
  { name: "Crisis Text Line", contact: "Text HOME to 741741", type: "crisis" },
  { name: "National Domestic Violence Hotline", contact: "1-800-799-7233", type: "dv" },
] as const;
