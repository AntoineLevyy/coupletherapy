import { posthog } from "./posthog";

/**
 * Track key product events.
 * Call these at the important moments in the user journey.
 */

type EventProperties = Record<string, string | number | boolean | null | undefined>;

function capture(event: string, properties?: EventProperties) {
  posthog.capture(event, properties);
}

export const track = {
  // Landing page
  landingPageViewed: () => capture("landing_viewed"),
  promptChipClicked: (prompt: string) => capture("prompt_chip_clicked", { prompt }),
  ctaClicked: (source?: string) => capture("cta_clicked", { source }),
  startVoiceClicked: (source?: string) => capture("start_voice_clicked", { source }),
  startTextClicked: (source?: string) => capture("start_text_clicked", { source }),
  longTermPlanClicked: () => capture("long_term_plan_clicked"),

  // Onboarding
  disclaimerAccepted: () => capture("disclaimer_accepted"),
  presenceAnswered: (presence: "solo" | "together" | "unknown") =>
    capture("presence_answered", { presence }),
  modeSelected: (mode: string) => capture("mode_selected", { mode }),

  // Session
  sessionStarted: (mode: string, type: string) =>
    capture("session_started", { mode, session_type: type }),
  sessionEnded: (duration: number, messageCount: number) =>
    capture("session_ended", { duration_seconds: duration, message_count: messageCount }),
  sessionError: (error: string) => capture("session_error", { error_type: error }),
  voiceSessionStarted: (properties?: EventProperties) => capture("voice_session_started", properties),
  voiceSessionFailed: (error: string, properties?: EventProperties) =>
    capture("voice_session_failed", { ...properties, error_type: error }),
  firstUserMessageSent: (properties?: EventProperties) => capture("first_user_message_sent", properties),
  firstCoachResponseReceived: (properties?: EventProperties) =>
    capture("first_coach_response_received", properties),
  endAndSummarizeClicked: (properties?: EventProperties) =>
    capture("end_and_summarize_clicked", properties),
  endedByNaturalSummaryRequest: (properties?: EventProperties) =>
    capture("ended_by_natural_summary_request", properties),

  // Report / dashboard
  reportGenerationStarted: (properties?: EventProperties) =>
    capture("report_generation_started", properties),
  reportGenerationSucceeded: (properties?: EventProperties) =>
    capture("report_generation_succeeded", properties),
  reportGenerationFailed: (error: string, properties?: EventProperties) =>
    capture("report_generation_failed", { ...properties, error_type: error }),
  synthesisViewed: () => capture("synthesis_viewed"),
  voiceReadbackStarted: () => capture("voice_readback_started"),
  saveReportClicked: (properties?: EventProperties) => capture("save_report_clicked", properties),
  reportViewed: (sessionId?: string, properties?: EventProperties) =>
    capture("report_viewed", { ...properties, session_id: sessionId }),

  // Auth
  signUpStarted: () => capture("signup_started"),
  signUpCompleted: () => capture("signup_completed"),
  signInCompleted: () => capture("signin_completed"),
  savedReportRestoredAfterSignup: () => capture("saved_report_restored_after_signup"),

  // Partner
  inviteLinkGenerated: () => capture("invite_link_generated"),
  inviteLinkCopied: () => capture("invite_link_copied"),
  inviteLinkShared: () => capture("invite_link_shared"),
  partnerJoined: () => capture("partner_joined"),

  // Plan
  planItemCompleted: (day: number, type: string) =>
    capture("plan_item_completed", { day_number: day, action_type: type }),
  planAISessionStarted: () => capture("plan_ai_session_started"),
};
