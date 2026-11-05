import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";

// Handles both link styles:
//  - ?token_hash=...&type=email  (custom email template, works across devices)
//  - ?code=...                   (default PKCE link, same browser only)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const to = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return url;
  };
  const fail = (error: string) => {
    const url = to("/login");
    url.search = `?error=${error}`;
    return NextResponse.redirect(url);
  };

  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) return fail("link");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    await supabase.auth.signOut();
    return fail("not_allowed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(to(profile ? "/" : "/onboarding"));
}
