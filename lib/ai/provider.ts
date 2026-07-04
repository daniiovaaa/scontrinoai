/**
 * Interfaccia astratta del provider di visione.
 * La pipeline dipende SOLO da questa interfaccia: cambiare modello
 * (Gemini → Claude → GPT → Mistral) significa scrivere una nuova
 * implementazione e cambiare un import. Nient'altro si tocca.
 */
export interface VisionProvider {
  /** Nome del modello, salvato a DB per tracciabilità (colonna model_used). */
  readonly modelName: string;

  /**
   * Manda immagine + prompt al modello e restituisce il testo grezzo
   * della risposta (che la pipeline poi parserà e validerà).
   */
  extractFromImage(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string>;
}