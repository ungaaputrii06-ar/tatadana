import { ReceiptItem } from '../types';

export interface GeminiParsedReceipt {
  merchantName: string;
  transactionDate: string;
  totalAmount: number;
  items: ReceiptItem[];
}

export class GeminiService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
  }

  /**
   * Generates text or JSON from Gemini
   */
  async generateText(prompt: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        console.error(`[Gemini API Error] ${res.status}: ${await res.text()}`);
        return null;
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
      console.error('[Gemini API Exception]', err);
      return null;
    }
  }

  /**
   * Vision OCR for receipt photos (Part 4.2 Pro Feature)
   * Extracts merchant name, items list, prices, total amount.
   */
  async parseReceiptVision(imageBase64: string, mimeType = 'image/jpeg'): Promise<GeminiParsedReceipt | null> {
    if (!this.apiKey) {
      // Mock result if offline/sandbox
      return {
        merchantName: 'Supermarket Sejahtera',
        transactionDate: new Date().toISOString(),
        totalAmount: 175000,
        items: [
          { item_name: 'Beras Premium 5kg', price: 75000, category_name: 'Belanja' },
          { item_name: 'Minyak Goreng 2L', price: 35000, category_name: 'Belanja' },
          { item_name: 'Daging Ayam 1kg', price: 40000, category_name: 'Makanan & Minuman' },
          { item_name: 'Telur Ayam 1kg', price: 25000, category_name: 'Makanan & Minuman' },
        ],
      };
    }

    try {
      const prompt = `Anda adalah OCR scanner struk belanja Indonesia untuk aplikasi TataDana.
Analisis foto struk berikut dan ekstrak data struk dalam format JSON murni:
{
  "merchantName": "Nama Toko / Restoran",
  "transactionDate": "YYYY-MM-DD",
  "totalAmount": number,
  "items": [
    { "item_name": "Nama Produk", "price": number, "category_name": "Makanan & Minuman" | "Belanja" | "Kesehatan" | "Hiburan" }
  ]
}
Hanya kembalikan JSON valid tanpa markdown formatting.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;

      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as GeminiParsedReceipt;
    } catch (err) {
      console.error('[Gemini Vision Exception]', err);
      return null;
    }
  }

  /**
   * Transcribe audio/voice note (Part 4.3 Voice Note Feature)
   */
  async transcribeAudio(audioBase64: string, mimeType = 'audio/ogg'): Promise<string | null> {
    if (!this.apiKey) {
      // Mock fallback
      return 'Beli bensin pertalite motor tiga puluh ribu';
    }

    try {
      const prompt = 'Transkripsikan rekaman suara bahasa Indonesia berikut secara akurat ke dalam teks teks murni.';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
      console.error('[Gemini Audio Exception]', err);
      return null;
    }
  }
}
