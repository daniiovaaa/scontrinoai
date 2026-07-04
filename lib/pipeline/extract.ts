import { receiptSchema, type Receipt } from "@/lib/schemas/receipt";
import { buildExtractionPrompt, buildRetryPrompt } from "@/lib/ai/prompts";
import { geminiProvider } from "@/lib/ai/gemini";
import type { VisionProvider } from "@/lib/ai/provider";

// Cambiare modello = cambiare questa riga. Tutto il resto è agnostico.
const provider: VisionProvider = geminiProvider;

const MAX_ATTEMPTS = 3;

export interface ExtractionResult {
  data: Receipt | null; // null se falliti tutti i tentativi
  attempts: number; // tentativi effettivamente usati
  rawOutput: string; // ultimo output grezzo del modello (per debug/trasparenza)
  errorLog: Array<{ attempt: number; error: unknown }>;
  modelUsed: string;
}

/**
 * IL CUORE DEL PROGETTO: pipeline estrazione → validazione → retry.
 *
 * 1. Manda l'immagine al modello con il prompt di estrazione.
 * 2. Se il modello segnala che l'immagine non è un documento di spesa
 *    (not_a_document), la pipeline fallisce SUBITO in modo pulito:
 *    nessun retry, nessun dato inventato a database.
 * 3. Altrimenti parsa l'output come JSON e lo valida contro lo schema Zod
 *    (che include un check di coerenza aritmetica: somma voci = totale,
 *    oppure totale al netto IVA nel caso delle fatture).
 * 4. Se la validazione fallisce, reinietta l'output + gli errori nel
 *    prompt di retry e riprova, fino a MAX_ATTEMPTS.
 *
 * Ogni tentativo e ogni errore vengono tracciati: finiscono a DB
 * (colonne attempts / error_log) e sono mostrati nell'UI.
 */
export async function extractReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ExtractionResult> {
  let prompt = buildExtractionPrompt();
  let rawOutput = "";
  const errorLog: ExtractionResult["errorLog"] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    rawOutput = await provider.extractFromImage(imageBase64, mimeType, prompt);

    // Difesa in profondità: anche se chiediamo JSON puro, ripuliamo
    // eventuali code fence che alcuni modelli aggiungono comunque.
    const cleaned = rawOutput.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      errorLog.push({ attempt, error: "Output non è JSON parsabile" });
      prompt = buildRetryPrompt(
        cleaned.slice(0, 2000),
        "L'output non è JSON valido: non è stato possibile fare il parsing."
      );
      continue;
    }

    // L'immagine non è un documento di spesa: fallimento pulito, subito.
    // Niente retry (l'immagine non cambierà) e niente dati inventati a DB.
    if ((parsed as { not_a_document?: boolean })?.not_a_document === true) {
      errorLog.push({
        attempt,
        error: "Immagine non riconosciuta come scontrino/ricevuta/fattura",
      });
      return {
        data: null,
        attempts: attempt,
        rawOutput: cleaned,
        errorLog,
        modelUsed: provider.modelName,
      };
    }

    const result = receiptSchema.safeParse(parsed);
    if (result.success) {
      return {
        data: result.data,
        attempts: attempt,
        rawOutput: cleaned,
        errorLog,
        modelUsed: provider.modelName,
      };
    }

    // Validazione fallita: logga e riprova con feedback strutturato.
    const flat = result.error.flatten();
    errorLog.push({ attempt, error: flat });
    prompt = buildRetryPrompt(cleaned, JSON.stringify(flat, null, 2));
  }

  return {
    data: null,
    attempts: MAX_ATTEMPTS,
    rawOutput,
    errorLog,
    modelUsed: provider.modelName,
  };
}