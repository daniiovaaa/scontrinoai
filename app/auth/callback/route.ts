import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Il magic link nell'email porta qui con un ?code=...
 * Scambiamo il code per una sessione (cookie) e mandiamo l'utente in dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code mancante o non valido (link scaduto, già usato…): torna al login.
  return NextResponse.redirect(`${origin}/login?error=link-non-valido`);
}