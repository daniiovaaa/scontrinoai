import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

interface LineItem {
  description: string;
  quantity: number;
  amount: number;
}

/**
 * Dettaglio scontrino: immagine originale + dati estratti fianco a fianco,
 * e in fondo — collassati — l'output grezzo del modello e l'error log.
 * Trasparenza totale sulla pipeline.
 */
export default async function ReceiptDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (!receipt) notFound();

  // URL firmato a scadenza breve: il bucket è privato, l'immagine
  // è accessibile solo tramite questo link temporaneo (10 minuti).
  const { data: signed } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receipt.image_path, 600);

  const items: LineItem[] = Array.isArray(receipt.line_items)
    ? (receipt.line_items as LineItem[])
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Torna alla dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {receipt.status === "failed"
              ? "⚠️ Immagine non riconosciuta"
              : receipt.merchant}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {receipt.receipt_date
              ? new Date(receipt.receipt_date).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Data non disponibile"}
            {" · "}modello: {receipt.model_used ?? "—"}
            {" · "}
            {receipt.attempts > 1
              ? `⟳ validato al tentativo ${receipt.attempts}`
              : "validato al primo tentativo"}
          </p>
        </div>
        {receipt.total != null && (
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">
              {eur.format(receipt.total)}
            </p>
            {receipt.vat_amount != null && (
              <p className="text-sm text-muted-foreground">
                di cui IVA {eur.format(receipt.vat_amount)}
                {receipt.vat_rate != null && ` (${receipt.vat_rate}%)`}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Immagine originale */}
        <div className="overflow-hidden rounded-xl border bg-muted/20">
          {signed?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signed.signedUrl}
              alt={`Scontrino ${receipt.merchant ?? ""}`}
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Immagine non disponibile
            </div>
          )}
        </div>

        {/* Dati estratti */}
        <div className="space-y-4">
          {receipt.category && (
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-sm">
              {String(receipt.category).replace("_", "/")}
            </span>
          )}

          {items.length > 0 ? (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        ×{item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {eur.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {receipt.status === "failed"
                ? "Nessun dato estratto da questa immagine."
                : "Voci non leggibili su questo documento (confidence bassa): totale e intestazione estratti, dettaglio non disponibile."}
            </p>
          )}

          {receipt.confidence && (
            <p className="text-sm">
              Affidabilità dichiarata dal modello:{" "}
              <strong>{receipt.confidence}</strong>
              {receipt.confidence === "low" &&
                " — consigliata verifica manuale dei dati"}
            </p>
          )}
        </div>
      </div>

      {/* Trasparenza pipeline: output grezzo + error log */}
      <details className="mt-10 rounded-lg border bg-muted/20 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          🔬 Dietro le quinte: output grezzo del modello e log della pipeline
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              raw_extraction
            </p>
            <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">
              {JSON.stringify(receipt.raw_extraction, null, 2)}
            </pre>
          </div>
          {receipt.error_log && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                error_log (tentativi falliti e motivi)
              </p>
              <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">
                {JSON.stringify(receipt.error_log, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </details>
    </main>
  );
}