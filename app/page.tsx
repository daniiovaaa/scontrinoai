import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { CategoryChart } from "@/components/category-chart";
import { ReceiptsTable, type ReceiptRow } from "@/components/receipts-table";

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/**
 * Dashboard: upload + statistiche + grafico per categoria + tabella.
 * Server component: i dati arrivano via RLS (solo quelli dell'utente),
 * la dropzone fa router.refresh() dopo ogni upload per aggiornarli.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("receipts")
    .select(
      "id, merchant, receipt_date, category, total, status, confidence, attempts, created_at"
    )
    .order("created_at", { ascending: false });

  const receipts = (data ?? []) as ReceiptRow[];
  const completed = receipts.filter((r) => r.status === "completed");

  // --- Statistiche ---
  const grandTotal = completed.reduce((s, r) => s + (r.total ?? 0), 0);
  const byCategory = new Map<string, number>();
  for (const r of completed) {
    if (!r.category || r.total == null) continue;
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.total);
  }
  const chartData = [...byCategory.entries()]
    .map(([category, total]) => ({
      category: category.replace("_", "/"),
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
  const topCategory = chartData[0]?.category ?? "—";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">🧾 ScontrinoAI</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* Upload */}
      <section className="mt-8">
        <UploadDropzone />
      </section>

      {/* Statistiche */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Totale spese</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {eur.format(grandTotal)}
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Documenti elaborati</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {completed.length}
            {receipts.length > completed.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (+{receipts.length - completed.length} non riconosciuti)
              </span>
            )}
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Categoria principale</p>
          <p className="mt-1 truncate text-2xl font-semibold">{topCategory}</p>
        </div>
      </section>

      {/* Grafico */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Spese per categoria</h2>
        <CategoryChart data={chartData} />
      </section>

      {/* Tabella */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Documenti</h2>
          {completed.length > 0 && (
            <a href="/api/export" className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted">⬇️ Esporta CSV</a>
          )}
        </div>
        <ReceiptsTable receipts={receipts} />
      </section>
    </main>
  );
}