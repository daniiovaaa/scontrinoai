import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Dashboard (placeholder per ora).
 * Il middleware garantisce che qui l'utente sia sempre autenticato.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">🧾 ScontrinoAI</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <p className="text-lg">Sei dentro. 🎉</p>
        <p className="mt-1 text-sm">
          Qui arriveranno upload e dashboard degli scontrini (Fase 3 e 4).
        </p>
      </section>
    </main>
  );
}