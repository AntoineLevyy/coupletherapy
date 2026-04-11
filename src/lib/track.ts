import { posthog } from "./posthog";

/**
 * Track key product events.
 * Call these at the important moments in the user journey.
 */

export const track = {
  // Landing page
  landingPageViewed: () => posthog.capture("landing_page_viewed"),
  ctaClicked: () => posthog.capture("cta_clicked"),

  // Onboarding
  disclaimerAccepted: () => posthog.capture("disclaimer_accepted"),
  modeSelected: (mode: string) => posthog.capture("mode_selected", { mode }),

  // Session
  sessionStarted: (mode: string, type: string) =>
    posthog.capture("session_started", { mode, session_type: type }),
  sessionEnded: (duration: number, messageCount: number) =>
    posthog.capture("session_ended", { duration_seconds: duration, message_count: messageCount }),
  sessionError: (error: string) =>
    posthog.capture("session_error", { error }),

  // Dashboard
  synthesisViewed: () => posthog.capture("synthesis_viewed"),
  voiceReadbackStarted: () => posthog.capture("voice_readback_started"),

  // Auth
  signUpStarted: () => posthog.capture("signup_started"),
  signUpCompleted: () => posthog.capture("signup_completed"),
  signInCompleted: () => posthog.capture("signin_completed"),

  // Partner
  inviteLinkGenerated: () => posthog.capture("invite_link_generated"),
  inviteLinkCopied: () => posthog.capture("invite_link_copied"),
  inviteLinkShared: () => posthog.capture("invite_link_shared"),
  partnerJoined: () => posthog.capture("partner_joined"),

  // Plan
  planItemCompleted: (day: number, type: string) =>
    posthog.capture("plan_item_completed", { day_number: day, action_type: type }),
  planAISessionStarted: () => posthog.capture("plan_ai_session_started"),

  // Report
  reportViewed: (sessionId: string) =>
    posthog.capture("report_viewed", { session_id: sessionId }),
};
