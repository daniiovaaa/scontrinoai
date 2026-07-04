import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { UploadTest } from "@/components/upload-test";

/**
 * Dashboard — per ora ospita il collaudo della pipeline.
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

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Collaudo pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Carica la foto di uno scontrino: la pipeline la manda al modello,
            valida il JSON e salva su database. (UI provvisoria — Fase 4 in
            arrivo.)
          </p>
        </div>
        <UploadTest />
      </section>
    </main>
  );
}