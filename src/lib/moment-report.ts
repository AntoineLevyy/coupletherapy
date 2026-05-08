export type MomentTranscriptMessage = {
  speaker: "HappyCouple" | "You";
  text: string;
};

export type MomentReportPreview = {
  title: string;
  confidenceNote: string;
  moment: string;
  underneath: string[];
  nextWords: string;
  avoid: string[];
  nextMove: string;
  unknowns: string[];
};

export type MomentReportGenerationMessage = {
  role: "system" | "user";
  content: string;
};

const ENDING_PATTERNS = [
  /\bsummar(y|ize|ise|ized|ised)\b/i,
  /\brecap\b/i,
  /\bthat's enough\b/i,
  /\bthat is enough\b/i,
  /\bi'?m done\b/i,
  /\bend (and )?(summarize|summarise|recap)\b/i,
  /\bquick summary\b/i,
];

const REPORT_SYSTEM_PROMPT = `You generate a first-session relationship coaching summary from a real voice transcript.

Return ONLY valid JSON with this exact shape:
{
  "title": "Your first moment summary",
  "confidenceNote": "One sentence saying this is based only on this first conversation, useful for the next step, not a diagnosis or full relationship report.",
  "moment": "Specific 1-2 sentence summary of the concrete moment the user brought up, using details from the transcript.",
  "underneath": ["2-4 cautious hypotheses about what may be underneath, each grounded in transcript evidence"],
  "nextWords": "A concrete script the user can say next, personalized to the transcript.",
  "avoid": ["2-4 specific things to avoid that would escalate this exact moment"],
  "nextMove": "One practical next move for the next 24-72 hours.",
  "unknowns": ["2-4 important things we do not know yet from this one conversation"]
}

Rules:
- Coaching only. Do not use therapy, therapist, treatment, diagnosis, disorder, patient, clinical, psychiatric, or mental illness language.
- Do not invent details, motives, history, frequency, safety level, or partner perspective that are not supported by the transcript.
- If something is inferred, phrase it as "may" / "might" / "could".
- Include concrete details from the user's actual words.
- The report should feel useful enough to save, but clearly caveated as a first read.
- Do not use the report as proof one partner is right.`;

export function shouldOfferReportFromUserMessage(message: string): boolean {
  return ENDING_PATTERNS.some((pattern) => pattern.test(message));
}

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function firstUserMoment(transcript: MomentTranscriptMessage[]) {
  return clean(transcript.find((message) => message.speaker === "You")?.text ?? "The conversation you just brought up");
}

function inferTheme(text: string) {
  const lower = text.toLowerCase();
  if (/chore|clean|house|carry|everything|support|labor/.test(lower)) return "support and shared responsibility";
  if (/defensive|attack|blame|fight|argu/.test(lower)) return "defensiveness and escalation";
  if (/shut down|silent|withdraw|avoid/.test(lower)) return "shutdown and withdrawal";
  if (/sex|intimacy|close|disconnect/.test(lower)) return "closeness and intimacy";
  if (/money|spend|financial/.test(lower)) return "money and trust";
  if (/apolog|repair|lied|trust/.test(lower)) return "repair and trust";
  return "a recurring relationship pattern";
}

function asString(value: unknown, fallback: string) {
  return clean(typeof value === "string" ? value : fallback) || fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => clean(String(item))).filter(Boolean).slice(0, 4);
  return items.length > 0 ? items : fallback;
}

export function buildMomentReportGenerationMessages(
  transcript: MomentTranscriptMessage[],
  focusMoment?: string
): MomentReportGenerationMessage[] {
  const formattedTranscript = transcript
    .map((entry) => `[${entry.speaker === "HappyCouple" ? "COACH" : "USER"}]: ${clean(entry.text)}`)
    .join("\n\n");

  return [
    { role: "system", content: REPORT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `FOCUS MOMENT\n${clean(focusMoment ?? "") || "Not separately provided."}\n\nTRANSCRIPT\n${formattedTranscript || "No transcript text captured."}\n\nGenerate the first moment summary from the transcript above.`,
    },
  ];
}

export function parseMomentReportModelResponse(responseText: string): MomentReportPreview {
  const cleaned = responseText
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<MomentReportPreview>;
  const fallback = buildMomentReportPreview([]);

  return {
    title: "Your first moment summary",
    confidenceNote: asString(
      parsed.confidenceNote,
      "Based only on this conversation, this is a first read — useful for the next step, not a diagnosis or complete relationship report."
    ),
    moment: asString(parsed.moment, fallback.moment),
    underneath: asStringArray(parsed.underneath, fallback.underneath),
    nextWords: asString(parsed.nextWords, fallback.nextWords),
    avoid: asStringArray(parsed.avoid, fallback.avoid),
    nextMove: asString(parsed.nextMove, fallback.nextMove),
    unknowns: asStringArray(parsed.unknowns, fallback.unknowns),
  };
}

export function buildMomentReportPreview(transcript: MomentTranscriptMessage[], focusMoment?: string): MomentReportPreview {
  const userText = clean(transcript.filter((message) => message.speaker === "You").map((message) => message.text).join(" "));
  const moment = clean(focusMoment ?? "") || firstUserMoment(transcript);
  const theme = inferTheme(userText || moment);

  return {
    title: "Your first moment summary",
    confidenceNote:
      "Based only on this conversation, this is a first read — useful for the next step, not a diagnosis or complete relationship report.",
    moment,
    underneath: [
      `This may be less about the surface topic and more about ${theme}.`,
      "One person may be trying to get reassurance or movement while the other may be protecting against blame, pressure, or failure.",
      "The useful move is to make the emotional need explicit before debating the facts.",
    ],
    nextWords:
      "Try: “I don’t want this to turn into a fight. I’m trying to explain what this brings up for me, and I want to understand your side too.”",
    avoid: [
      "Do not lead with labels like “you always” or “you never.”",
      "Do not use the report as proof that your partner is wrong.",
      "Do not try to solve the entire pattern in one conversation.",
    ],
    nextMove:
      "Have one short follow-up conversation focused on understanding the pattern, then check whether the same loop shows up again this week.",
    unknowns: [
      "We do not yet know your partner’s perspective.",
      "We do not yet know how often this pattern repeats.",
      "We do not yet know what has already been tried or what repair attempts have worked before.",
    ],
  };
}
