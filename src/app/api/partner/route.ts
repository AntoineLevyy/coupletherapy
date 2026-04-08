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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/**
 * POST /api/partner — Join a couple via invite code
 */
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code required" },
        { status: 400 }
      );
    }

    // Find the pending couple with this invite code
    const { data: couple, error: findError } = await supabase
      .from("couples")
      .select("*")
      .eq("invite_code", inviteCode)
      .eq("status", "pending")
      .single();

    if (findError || !couple) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    // Can't join your own couple
    if (couple.partner_a === user.id) {
      return NextResponse.json(
        { error: "You can't join your own invite" },
        { status: 400 }
      );
    }

    // Link partner B and activate
    const { error: updateError } = await supabase
      .from("couples")
      .update({
        partner_b: user.id,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", couple.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to link partner" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, coupleId: couple.id });
  } catch (error) {
    console.error("Partner link error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
