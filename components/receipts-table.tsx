import Link from "next/link";

export interface ReceiptRow {
  id: string;
  merchant: string | null;
  receipt_date: string | null;
  category: string | null;
  total: number | null;
  status: "processing" | "completed" | "failed";
  confidence: string | null;
  attempts: number;
  created_at: string;
}

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

// Badge in versione dark: colore al 15% come sfondo, testo saturo.
const confidenceStyle: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-red-500/15 text-red-400",
};

export function ReceiptsTable({ receipts }: { receipts: ReceiptRow[] }) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nessuno scontrino ancora: carica il primo qui sopra. 👆
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Esercente</th>
            <th className="px-4 py-3 font-medium">Data spesa</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Totale</th>
            <th className="px-4 py-3 font-medium">Affidabilità</th>
            <th className="px-4 py-3 font-medium text-center">Tentativi</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr
              key={r.id}
              className="border-b transition-colors last:border-0 hover:bg-primary/5"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/receipts/${r.id}`}
                  className="font-medium underline-offset-4 hover:text-primary hover:underline"
                >
                  {r.status === "failed" ? "⚠️ Non riconosciuto" : r.merchant ?? "—"}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.receipt_date
                  ? new Date(r.receipt_date).toLocaleDateString("it-IT")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {r.category ? (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                    {r.category.replace("_", "/")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {r.total != null ? eur.format(r.total) : "—"}
              </td>
              <td className="px-4 py-3">
                {r.confidence ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      confidenceStyle[r.confidence] ?? "bg-secondary"
                    }`}
                  >
                    {r.confidence}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    failed
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                {r.attempts > 1 ? (
                  <span className="text-amber-400">⟳ {r.attempts}</span>
                ) : (
                  r.attempts
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}