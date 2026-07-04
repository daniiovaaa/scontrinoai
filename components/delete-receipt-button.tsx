"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Eliminazione con conferma inline (niente popup di sistema):
 * primo click → chiede conferma; secondo click → elimina e torna in dashboard.
 */
export function DeleteReceiptButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Eliminazione fallita, riprova");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Errore di rete, riprova");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
        onClick={() => setConfirming(true)}
      >
        🗑 Elimina
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Definitivo: si eliminano dati e immagine.
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300"
        disabled={busy}
        onClick={handleDelete}
      >
        {busy ? "Elimino…" : "Sì, elimina"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => setConfirming(false)}
      >
        Annulla
      </Button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </span>
  );
}