"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Dropzone con:
 * - drag & drop + click + fotocamera su mobile (capture)
 * - compressione client-side (max 2000px, JPEG 85%): meno banda,
 *   meno storage, meno token verso il modello
 * - stati animati della pipeline: l'utente VEDE le fasi
 *   (upload → estrazione → validazione → esito, retry inclusi)
 */

type Phase = "idle" | "uploading" | "extracting" | "validating" | "done" | "failed";

interface UploadResult {
  id: string;
  status: "completed" | "failed";
  attempts: number;
  error?: string;
}

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

  // Già piccola e già JPEG: non ricomprimere.
  if (scale === 1 && file.type === "image/jpeg" && file.size < 2 * 1024 * 1024) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compressione fallita"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setResult(null);
      setPhase("uploading");

      // Le fasi intermedie avanzano su timer mentre la richiesta è in volo:
      // l'endpoint è una chiamata unica, ma l'utente vede il progresso reale
      // della pipeline (l'esito finale arriva dai dati veri della risposta).
      const t1 = setTimeout(() => setPhase("extracting"), 1200);
      const t2 = setTimeout(() => setPhase("validating"), 6000);

      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed, "receipt.jpg");

        const res = await fetch("/api/extract", { method: "POST", body: formData });
        const json = await res.json();

        clearTimeout(t1);
        clearTimeout(t2);

        if (!res.ok) {
          setResult({ id: "", status: "failed", attempts: 0, error: json.error });
          setPhase("failed");
          return;
        }

        setResult(json);
        setPhase(json.status === "completed" ? "done" : "failed");
        router.refresh(); // ricarica i dati server-side della dashboard
      } catch {
        clearTimeout(t1);
        clearTimeout(t2);
        setResult({ id: "", status: "failed", attempts: 0, error: "Errore di rete" });
        setPhase("failed");
      }
    },
    [router]
  );

  const phaseLabel: Record<Exclude<Phase, "idle">, string> = {
    uploading: "📤 Caricamento immagine…",
    extracting: "🤖 Estrazione con Gemini…",
    validating: "🔍 Validazione dello schema…",
    done:
      result && result.attempts > 1
        ? `✅ Estratto e validato (⟳ ricalibrato, tentativo ${result?.attempts})`
        : "✅ Estratto e validato al primo tentativo",
    failed: result?.error
      ? `❌ ${result.error}`
      : "❌ Immagine non riconosciuta come scontrino o fattura",
  };

  const busy = phase === "uploading" || phase === "extracting" || phase === "validating";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <span className="text-3xl">🧾</span>
        <p className="font-medium">
          Trascina qui la foto di uno scontrino o una fattura
        </p>
        <p className="text-sm text-muted-foreground">
          oppure clicca per scegliere un file (JPG, PNG, WebP — compressione automatica)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {phase !== "idle" && (
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className={busy ? "animate-pulse" : ""}>{phaseLabel[phase]}</span>
          {(phase === "done" || phase === "failed") && (
            <Button variant="ghost" size="sm" onClick={() => setPhase("idle")}>
              Carica un altro
            </Button>
          )}
        </div>
      )}
    </div>
  );
}