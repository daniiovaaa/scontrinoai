import { GoogleGenAI } from "@google/genai";
import type { VisionProvider } from "./provider";

const MODEL = "gemini-2.5-flash";

/**
 * Implementazione Gemini del VisionProvider.
 * - responseMimeType "application/json" forza il modello a rispondere
 *   in JSON puro (la validazione Zod resta comunque: fidarsi è bene...).
 * - temperature 0: per l'estrazione dati vogliamo determinismo, non creatività.
 */
export const geminiProvider: VisionProvider = {
  modelName: MODEL,

  async extractFromImage(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    });

    return response.text ?? "";
  },
};