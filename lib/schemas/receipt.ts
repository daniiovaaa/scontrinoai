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
    (r) => {
      if (r.line_items.length === 0) return true;
      const sum = r.line_items.reduce((s, i) => s + i.amount, 0);
      const close = (a: number, b: number) => Math.abs(a - b) < 0.05;
      return (
        close(sum, r.total) ||
        (r.vat_amount != null && close(sum, r.total - r.vat_amount))
      );
    },
    {
      message:
        "La somma delle voci non corrisponde né al totale né al totale al netto IVA: ricontrolla i numeri come stampati, senza modificarli",
      path: ["line_items"],
    }
  );

export type Receipt = z.infer<typeof receiptSchema>;