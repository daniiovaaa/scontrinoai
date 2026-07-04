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

const confidenceStyle: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

export function ReceiptsTable({ receipts }: { receipts: ReceiptRow[] }) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nessuno scontrino ancora: carica il primo qui sopra. 👆
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Esercente</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Totale</th>
            <th className="px-4 py-3 font-medium">Affidabilità</th>
            <th className="px-4 py-3 font-medium text-center">Tentativi</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link
                  href={`/receipts/${r.id}`}
                  className="font-medium underline-offset-4 hover:underline"
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
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
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
                      confidenceStyle[r.confidence] ?? "bg-muted"
                    }`}
                  >
                    {r.confidence}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    failed
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">
                {r.attempts > 1 ? `⟳ ${r.attempts}` : r.attempts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}