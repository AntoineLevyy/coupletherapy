import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

/**
 * POST /api/save-session
 * Saves a completed session to Supabase.
 * For "together" mode, saves the session to both partners.
 */
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { mode, sessionType, startedAt, completedAt, transcript, synthesis } = await request.json();

    // Find the user's active couple
    let coupleId: string | null = null;
    let partnerId: string | null = null;
    const { data: coupleData } = await supabase
      .from("couples")
      .select("id, partner_a, partner_b")
      .eq("status", "active")
      .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
      .limit(1)
      .single();

    if (coupleData) {
      coupleId = coupleData.id;
      partnerId = coupleData.partner_a === user.id ? coupleData.partner_b : coupleData.partner_a;
    }

    // Create session record for the current user
    const { data: sessionRecord, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        couple_id: coupleId,
        mode,
        session_type: sessionType || "initial",
        started_at: startedAt,
        completed_at: completedAt,
        status: "completed",
      })
      .select("id")
      .single();

    if (sessionError || !sessionRecord) {
      console.error("Failed to save session:", sessionError);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }

    // Save transcript (private to this user)
    if (transcript?.length > 0) {
      await supabase.from("transcripts").insert({
        session_id: sessionRecord.id,
        user_id: user.id,
        entries: transcript,
      });
    }

    // Save synthesis
    if (synthesis) {
      await supabase.from("syntheses").insert({
        session_id: sessionRecord.id,
        user_id: user.id,
        couple_id: coupleId,
        synthesis_type: "individual",
        data: synthesis,
        voice_script: synthesis.voiceScript,
      });

      // Save dimension scores for longitudinal tracking
      if (synthesis.dimensions?.length > 0) {
        const dimRecords = synthesis.dimensions.map((d: { id: string; name: string; score: number; insight: string; evidence: string }) => ({
          session_id: sessionRecord.id,
          user_id: user.id,
          dimension_id: d.id,
          dimension_name: d.name,
          score: d.score,
          insight: d.insight,
          evidence: d.evidence,
        }));
        await supabase.from("dimension_scores").insert(dimRecords);
      }

      // Save plan items from the synthesis
      if (synthesis.plan) {
        // Create a plan record
        const { data: planRecord } = await supabase
          .from("plans")
          .insert({
            user_id: user.id,
            couple_id: coupleId,
            plan_type: "7-day",
            starts_at: new Date().toISOString().split("T")[0],
            ends_at: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
            status: "active",
          })
          .select("id")
          .single();

        if (planRecord) {
          // Supersede any previous active plans
          await supabase
            .from("plans")
            .update({ status: "superseded" })
            .eq("user_id", user.id)
            .eq("status", "active")
            .neq("id", planRecord.id);

          // Combine all tracks into plan items
          const allItems = [
            ...(synthesis.plan.track1 || []),
            ...(synthesis.plan.track2 || []),
            ...(synthesis.plan.track3 || []),
          ];

          if (allItems.length > 0) {
            const planItems = allItems.map((item: { day: string; action: string; detail: string; why: string; type: string }, idx: number) => ({
              plan_id: planRecord.id,
              user_id: user.id,
              day_number: parseInt(item.day.replace(/\D/g, "")) || idx + 1,
              action_type: item.type || "exercise",
              title: item.action,
              description: item.detail,
              why: item.why,
              completed: false,
            }));
            await supabase.from("plan_items").insert(planItems);
          }

          // If "together" mode and has partner, create the plan for partner too
          if (mode === "together" && partnerId) {
            const { data: partnerPlan } = await supabase
              .from("plans")
              .insert({
                user_id: partnerId,
                couple_id: coupleId,
                plan_type: "7-day",
                starts_at: new Date().toISOString().split("T")[0],
                ends_at: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
                status: "active",
              })
              .select("id")
              .single();

            if (partnerPlan) {
              // Supersede partner's previous plans
              await supabase
                .from("plans")
                .update({ status: "superseded" })
                .eq("user_id", partnerId)
                .eq("status", "active")
                .neq("id", partnerPlan.id);

              const partnerItems = allItems.map((item: { day: string; action: string; detail: string; why: string; type: string }, idx: number) => ({
                plan_id: partnerPlan.id,
                user_id: partnerId,
                day_number: parseInt(item.day.replace(/\D/g, "")) || idx + 1,
                action_type: item.type || "exercise",
                title: item.action,
                description: item.detail,
                why: item.why,
                completed: false,
              }));
              await supabase.from("plan_items").insert(partnerItems);
            }
          }
        }
      }
    }

    // If "together" mode and has partner, also create a session record for the partner
    if (mode === "together" && partnerId) {
      const { data: partnerSession } = await supabase
        .from("sessions")
        .insert({
          user_id: partnerId,
          couple_id: coupleId,
          mode,
          session_type: sessionType || "initial",
          started_at: startedAt,
          completed_at: completedAt,
          status: "completed",
        })
        .select("id")
        .single();

      // Save synthesis for partner too (same data, different user_id)
      if (partnerSession && synthesis) {
        await supabase.from("syntheses").insert({
          session_id: partnerSession.id,
          user_id: partnerId,
          couple_id: coupleId,
          synthesis_type: "individual",
          data: synthesis,
          voice_script: synthesis.voiceScript,
        });

        if (synthesis.dimensions?.length > 0) {
          const partnerDims = synthesis.dimensions.map((d: { id: string; name: string; score: number; insight: string; evidence: string }) => ({
            session_id: partnerSession.id,
            user_id: partnerId,
            dimension_id: d.id,
            dimension_name: d.name,
            score: d.score,
            insight: d.insight,
            evidence: d.evidence,
          }));
          await supabase.from("dimension_scores").insert(partnerDims);
        }
      }
    }

    return NextResponse.json({ success: true, sessionId: sessionRecord.id });
  } catch (error) {
    console.error("Save session error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
