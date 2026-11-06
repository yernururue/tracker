import { NextResponse } from "next/server";
import { isAllowed } from "@/lib/allowlist";
import { loadDashboard } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const snapshot = await loadDashboard(supabase, user.id);
  if (snapshot.error) {
    return NextResponse.json({ error: snapshot.error }, { status: 500, headers });
  }

  return NextResponse.json(snapshot, { headers });
}
