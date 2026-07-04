import { CATEGORIES } from "@/lib/schemas/receipt";

/**
 * Prompt del primo tentativo di estrazione.
 */
export function buildExtractionPrompt(): string {
  return `Sei un sistema di estrazione dati da scontrini e ricevute italiane.
Analizza l'immagine e restituisci ESCLUSIVAMENTE un oggetto JSON valido,
senza backtick, senza markdown, senza testo prima o dopo.

Schema richiesto:
{
  "merchant": string,            // nome esercente come stampato
  "receipt_date": string,        // "YYYY-MM-DD"
  "total": number,               // totale pagato (usa il punto come decimale)
  "vat_amount": number | null,   // importo IVA se presente, altrimenti null
  "vat_rate": number | null,     // aliquota IVA (es. 22), altrimenti null
  "currency": string,            // codice ISO 4217, default "EUR"
  "category": string,            // una tra: ${CATEGORIES.join(", ")}
  "line_items": [                // voci di spesa; array vuoto se illeggibili
    { "description": string, "quantity": number, "amount": number }
  ],
  "confidence": "high" | "medium" | "low"  // quanto è leggibile lo scontrino
}

Regole:
- Le date italiane sono spesso GG/MM/AA o GG-MM-AAAA: convertile sempre in YYYY-MM-DD.
- I decimali italiani usano la virgola ("12,50"): convertili in numero con il punto (12.50).
- "amount" in line_items è il totale della riga (quantity × prezzo unitario).
- La somma degli "amount" in line_items deve corrispondere a "total".
  Se non torna, ricontrolla i numeri prima di rispondere.
- Se un campo è illeggibile: null per i campi nullable, la tua migliore stima
  per gli altri, e abbassa "confidence".
- Non inventare voci che non vedi nell'immagine.
- Se l'immagine NON è uno scontrino, una ricevuta o una fattura, rispondi
  esclusivamente con: {"not_a_document": true}
- Se le voci sono COMPLETAMENTE illeggibili, restituisci line_items: [] e
  confidence "low". Se sono leggibili anche solo parzialmente, estrai quelle
  che leggi con ragionevole certezza e ometti le altre. È VIETATO inventare
  voci non visibili: meglio un elenco incompleto di un dato falso.
- Nelle FATTURE gli importi delle voci sono spesso IVA esclusa mentre il
  totale è IVA inclusa: in quel caso riporta gli importi COME STAMPATI,
  senza modificarli.`;
}

/**
 * Prompt di retry: reinietta l'output precedente e gli errori di validazione,
 * chiedendo al modello di correggere solo ciò che non regge.
 */
export function buildRetryPrompt(
  previousOutput: string,
  validationErrors: string
): string {
  return `Il JSON che hai prodotto per questo scontrino non ha superato la validazione.

Il tuo output precedente:
${previousOutput}

Errori di validazione:
${validationErrors}

Correggi SOLO i problemi indicati mantenendo il resto invariato.
Riesamina l'immagine per i campi contestati.
Rispondi di nuovo ESCLUSIVAMENTE con l'oggetto JSON, senza backtick né altro testo.`;
}