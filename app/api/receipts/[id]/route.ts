import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/receipts/[id] — elimina un documento:
 * 1. la riga a database (la RLS garantisce che sia dell'utente)
 * 2. l'immagine dallo Storage (niente file orfani)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // La select passa dalla RLS: se il documento non è tuo, per te non esiste.
  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, image_path")
    .eq("id", id)
    .single();

  if (!receipt) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  // Prima l'immagine, poi la riga: se lo Storage fallisce, il record
  // resta consultabile invece di lasciare un file orfano nel bucket.
  const { error: storageError } = await supabase.storage
    .from("receipts")
    .remove([receipt.image_path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    return NextResponse.json(
      { error: "Errore nell'eliminazione dell'immagine" },
      { status: 500 }
    );
  }

  const { error: dbError } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    return NextResponse.json(
      { error: "Errore nell'eliminazione del documento" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}