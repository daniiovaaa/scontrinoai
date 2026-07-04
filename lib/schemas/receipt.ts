import { z } from "zod";

/**
 * Schema Zod del risultato di estrazione — FONTE UNICA DI VERITÀ.
 * Usato per: validazione runtime, tipi TypeScript, e descrizione
 * dello schema dentro il prompt.
 */

export const CATEGORIES = [
  "ristorazione",
  "trasporti",
  "carburante",
  "ufficio",
  "hardware_software",
  "alloggio",
  "utenze",
  "altro",
] as const;

export const receiptSchema = z
  .object({
    merchant: z.string().min(1),
    receipt_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data richiesta in formato YYYY-MM-DD"),
    total: z.number().positive(),
    vat_amount: z.number().nonnegative().nullable(),
    vat_rate: z.number().min(0).max(30).nullable(),
    currency: z.string().length(3).default("EUR"),
    category: z.enum(CATEGORIES),
    line_items: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number().positive().default(1),
          amount: z.number(),
        })
      )
      .default([]),
    confidence: z.enum(["high", "medium", "low"]),
  })
  .refine(
    (r) =>
      r.line_items.length === 0 ||
      Math.abs(
        r.line_items.reduce((sum, item) => sum + item.amount, 0) - r.total
      ) < 0.05,
    {
      message:
        "La somma degli importi in line_items non corrisponde a total: ricontrolla i numeri sullo scontrino",
      path: ["line_items"],
    }
  );

export type Receipt = z.infer<typeof receiptSchema>;