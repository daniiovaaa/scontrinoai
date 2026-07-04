import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase per il SERVER (server components, route handlers, server actions).
 * Legge/scrive la sessione nei cookie della richiesta.
 */
export async function createClient() {
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
          } catch {
            // Chiamato da un Server Component: i cookie non sono scrivibili qui.
            // Nessun problema — il refresh della sessione lo gestisce il middleware.
          }
        },
      },
    }
  );
}