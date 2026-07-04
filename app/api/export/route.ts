import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/export — esporta gli scontrini dell'utente in CSV.
 * La RLS garantisce che la query restituisca solo i record propri.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select(
      "merchant, receipt_date, category, total, vat_amount, vat_rate, currency, status, confidence, attempts, created_at"
    )
    .order("receipt_date", { ascending: false });

  if (error) {
    console.error("Export query error:", error);
    return NextResponse.json({ error: "Errore nell'export" }, { status: 500 });
  }

  const header = [
    "esercente",
    "data",
    "categoria",
    "totale",
    "iva",
    "aliquota_iva",
    "valuta",
    "stato",
    "affidabilita",
    "tentativi",
    "caricato_il",
  ];

  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    // Regola CSV: raddoppia le virgolette e racchiudi se contiene separatori.
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = (receipts ?? []).map((r) =>
    [
      r.merchant,
      r.receipt_date,
      r.category,
      r.total,
      r.vat_amount,
      r.vat_rate,
      r.currency,
      r.status,
      r.confidence,
      r.attempts,
      r.created_at,
    ]
      .map(escape)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scontrinoai-export.csv"`,
    },
  });
}