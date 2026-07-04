import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceipt } from "@/lib/pipeline/extract";

// Le chiamate al modello possono richiedere tempo (soprattutto con retry):
// alziamo il timeout della function a 60s.
export const maxDuration = 60;

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * POST /api/extract — orchestrazione completa:
 * 1. Autenticazione (la RLS farà il resto lato DB)
 * 2. Validazione del file (tipo, dimensione)
 * 3. Upload dell'immagine su Supabase Storage
 * 4. Pipeline di estrazione (con retry)
 * 5. Persistenza del risultato su Postgres
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // --- Validazione input ---
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato non supportato: usa JPG, PNG o WebP" },
      { status: 415 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File troppo grande (max 8 MB)" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const receiptId = crypto.randomUUID();
  const imagePath = `${user.id}/${receiptId}.${ext}`;

  // --- Upload su Storage (bucket privato, path segregato per utente) ---
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(imagePath, buffer, { contentType: file.type });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Errore nel salvataggio dell'immagine" },
      { status: 500 }
    );
  }

  // --- Pipeline di estrazione ---
  let extraction;
  try {
    extraction = await extractReceipt(buffer.toString("base64"), file.type);
  } catch (err) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: "Errore nella pipeline di estrazione" },
      { status: 502 }
    );
  }

  const { data, attempts, rawOutput, errorLog, modelUsed } = extraction;

  // --- Persistenza (la RLS garantisce user_id = auth.uid()) ---
  const { error: dbError } = await supabase.from("receipts").insert({
    id: receiptId,
    user_id: user.id,
    image_path: imagePath,
    status: data ? "completed" : "failed",
    merchant: data?.merchant ?? null,
    receipt_date: data?.receipt_date ?? null,
    total: data?.total ?? null,
    vat_amount: data?.vat_amount ?? null,
    vat_rate: data?.vat_rate ?? null,
    currency: data?.currency ?? "EUR",
    category: data?.category ?? null,
    line_items: data?.line_items ?? null,
    raw_extraction: rawOutput ? JSON.parse(safeJson(rawOutput)) : null,
    attempts,
    model_used: modelUsed,
    confidence: data?.confidence ?? null,
    error_log: errorLog.length > 0 ? errorLog : null,
  });

  if (dbError) {
    console.error("DB insert error:", dbError);
    return NextResponse.json(
      { error: "Errore nel salvataggio dei dati" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: receiptId,
    status: data ? "completed" : "failed",
    attempts,
    data,
    errorLog,
  });
}

/** Se il raw output non è JSON valido (estrazione fallita), lo impacchetta come stringa. */
function safeJson(raw: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return JSON.stringify({ unparsable_output: raw.slice(0, 4000) });
  }
}