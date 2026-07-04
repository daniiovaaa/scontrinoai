"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Componente PROVVISORIO per collaudare la pipeline (Fase 3).
 * Nella Fase 4 verrà sostituito dalla dropzone vera + dashboard.
 */
export function UploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setResult(`Errore di rete: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <Button onClick={handleUpload} disabled={!file || loading}>
          {loading ? "Estrazione in corso… ⏳" : "Estrai dati 🧾"}
        </Button>
      </div>

      {result && (
        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-4 text-left text-xs">
          {result}
        </pre>
      )}
    </div>
  );
}