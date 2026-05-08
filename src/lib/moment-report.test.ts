import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMomentReportGenerationMessages,
  buildMomentReportPreview,
  parseMomentReportModelResponse,
  shouldOfferReportFromUserMessage,
} from "./moment-report";

test("buildMomentReportPreview creates a cautious first-moment report from available transcript", () => {
  const report = buildMomentReportPreview([
    { speaker: "You", text: "My partner shuts down every time I bring up chores and then I get frustrated." },
    { speaker: "HappyCouple", text: "That sounds like a recurring pursue-withdraw pattern." },
    { speaker: "You", text: "I want to say it without blame." },
  ]);

  assert.equal(report.title, "Your first moment summary");
  assert.match(report.moment, /chores/i);
  assert.ok(report.underneath.length >= 2);
  assert.ok(report.nextWords.length > 20);
  assert.ok(report.avoid.length >= 2);
  assert.ok(report.unknowns.some((item) => item.includes("partner")));
  assert.match(report.confidenceNote, /Based only on this conversation/i);
});

test("buildMomentReportGenerationMessages sends the full real transcript and strict caveat instructions", () => {
  const messages = buildMomentReportGenerationMessages([
    { speaker: "You", text: "When I bring up chores, my partner shuts down." },
    { speaker: "HappyCouple", text: "What happens right before they shut down?" },
    { speaker: "You", text: "I probably sound angry because I feel alone with the house." },
  ], "chores blowup");

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.match(messages[0].content, /Return ONLY valid JSON/i);
  assert.match(messages[0].content, /Do not invent/i);
  assert.match(messages[1].content, /\[USER\]: When I bring up chores/i);
  assert.match(messages[1].content, /\[COACH\]: What happens right before/i);
  assert.match(messages[1].content, /\[USER\]: I probably sound angry/i);
  assert.match(messages[1].content, /FOCUS MOMENT\nchores blowup/i);
});

test("parseMomentReportModelResponse coerces clean model JSON into the report schema", () => {
  const report = parseMomentReportModelResponse(JSON.stringify({
    title: "A custom title should be ignored",
    confidenceNote: "This is based only on this first conversation and should be treated as a first read.",
    moment: "You described getting angry when chores come up because you feel alone with the house.",
    underneath: ["The fight may be carrying a need for support.", "Shutdown may be protection from blame."],
    nextWords: "Try: ‘I am not trying to blame you. I want to explain why this feels lonely and hear what it feels like for you.’",
    avoid: ["Do not start with you never help.", "Do not use the summary as proof."],
    nextMove: "Have a 10-minute conversation about one chore handoff this week.",
    unknowns: ["We have not heard your partner’s perspective.", "We do not know how often this happens."],
  }));

  assert.equal(report.title, "Your first moment summary");
  assert.match(report.moment, /chores/i);
  assert.equal(report.underneath.length, 2);
  assert.equal(report.unknowns.length, 2);
});

test("shouldOfferReportFromUserMessage recognizes natural end-of-session requests", () => {
  assert.equal(shouldOfferReportFromUserMessage("that's enough, can you summarize this?"), true);
  assert.equal(shouldOfferReportFromUserMessage("let's keep talking about this"), false);
});
