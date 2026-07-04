"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Dopo il click sul link nell'email, Supabase rimanda qui:
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            🧾 ScontrinoAI
          </h1>
          <p className="text-sm text-muted-foreground">
            Inserisci la tua email: ti mandiamo un link di accesso, niente
            password.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
            📬 Fatto! Controlla la casella di <strong>{email}</strong> e clicca
            il link per entrare.
            <p className="mt-2 text-xs text-muted-foreground">
              Non arriva? Guarda nello spam, oppure{" "}
              <button
                onClick={() => setStatus("idle")}
                className="underline underline-offset-2"
              >
                riprova
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Invio in corso…" : "Inviami il link"}
            </Button>
            {status === "error" && (
              <p className="text-center text-sm text-red-500">
                Qualcosa è andato storto. Riprova tra qualche secondo.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}