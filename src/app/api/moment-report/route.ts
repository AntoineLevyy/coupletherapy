import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildMomentReportGenerationMessages,
  buildMomentReportPreview,
  parseMomentReportModelResponse,
  type MomentTranscriptMessage,
} from "@/lib/moment-report";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeTranscript(input: unknown): MomentTranscriptMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const speaker = "speaker" in entry ? entry.speaker : undefined;
      const text = "text" in entry ? entry.text : undefined;
      if ((speaker !== "HappyCouple" && speaker !== "You") || typeof text !== "string" || !text.trim()) return null;
      return { speaker, text: text.trim() } satisfies MomentTranscriptMessage;
    })
    .filter((entry): entry is MomentTranscriptMessage => Boolean(entry));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript = normalizeTranscript(body.transcript);
    const focusMoment = typeof body.focusMoment === "string" ? body.focusMoment : undefined;

    if (transcript.length === 0 && !focusMoment?.trim()) {
      return NextResponse.json({ error: "No conversation content provided" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(buildMomentReportPreview(transcript, focusMoment));
    }

    const messages = buildMomentReportGenerationMessages(transcript, focusMoment);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    const report = parseMomentReportModelResponse(responseText);

    return NextResponse.json(report);
  } catch (error) {
    console.error("Moment report generation failed:", error);
    return NextResponse.json({ error: "Moment report generation failed" }, { status: 500 });
  }
}
