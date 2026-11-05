import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/allowlist";
import { parseRange, reportsToMarkdown } from "@/lib/reports";
import { loadProfiles, loadReportDoc } from "@/lib/reports-data";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/time";

// Exports exactly what /reports?tab=doc shows for the same range and person.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const range = parseRange(params.get("range"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profiles = await loadProfiles(supabase);
  const u = params.get("u");
  const personId = u && profiles.some((p) => p.id === u) ? u : null;

  const { weeks, title, error } = await loadReportDoc(supabase, profiles, range, personId);
  if (error) return NextResponse.json({ error }, { status: 500 });

  const md = reportsToMarkdown(weeks, title);
  const filename = `reports-${range === "all" ? "all" : `${range}d`}-${dayKey(new Date())}.md`;
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
