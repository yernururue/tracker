import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/allowlist";
import { buildReportMarkdown } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey, dayStartUtc } from "@/lib/time";
import type { Profile, Session } from "@/lib/types";

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get("days") === "14" ? 14 : 7;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const toKey = dayKey(new Date());
  const fromKey = addDays(toKey, -(days - 1));

  const [profilesRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase
      .from("sessions")
      .select("*")
      .gte("started_at", dayStartUtc(fromKey))
      .order("started_at", { ascending: true })
      .limit(5000)
      .returns<Session[]>(),
  ]);

  const error = profilesRes.error ?? sessionsRes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const md = buildReportMarkdown(profilesRes.data ?? [], sessionsRes.data ?? [], fromKey, toKey, days);

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="reports-${days}d-${toKey}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
