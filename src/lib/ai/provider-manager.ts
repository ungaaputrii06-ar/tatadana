import { mockStore } from '../supabase/mock-store';
import { dataStore } from '../storage-mock';
import { GeminiService } from './gemini';
import { parseTransactionWithAI, inferWallet } from './parser';
import { AIFeature, AIProviderConfig, AISettings, ParsedTransaction, AILog } from '../types';

export class AIProviderManager {
  /**
   * Retrieves active providers sorted by priority ascending (1 is highest priority)
   */
  static getActiveProviders(): AIProviderConfig[] {
    const list = Array.from(mockStore.aiProviders.values()).filter((p) => p.is_active);
    return list.sort((a, b) => a.priority - b.priority);
  }

  static getSettings(): AISettings {
    return mockStore.aiSettings;
  }

  /**
   * OpenAI API chat completions adapter
   */
  static async callOpenAI(apiKey: string, model: string, prompt: string): Promise<string | null> {
    if (!apiKey || apiKey.startsWith('sk_mock') || apiKey === 'mock_key') {
      throw new Error('OpenAI API key is missing or mock credentials');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * DeepSeek API chat completions adapter (OpenAI-compatible)
   */
  static async callDeepSeek(apiKey: string, model: string, prompt: string): Promise<string | null> {
    if (!apiKey || apiKey.startsWith('dsk_mock') || apiKey === 'mock_key') {
      throw new Error('DeepSeek API key is missing or mock credentials');
    }

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * Google Gemini adapter
   */
  static async callGemini(apiKey: string, model: string, prompt: string): Promise<string | null> {
    const service = new GeminiService(apiKey, model || 'gemini-1.5-flash');
    const result = await service.generateText(prompt);
    if (!result) {
      throw new Error('Gemini API returned empty response or offline');
    }
    return result;
  }

  /**
   * Executes AI text generation with multi-provider failover
   */
  static async executeTextGeneration(
    prompt: string,
    feature: AIFeature = 'telegram_text'
  ): Promise<string | null> {
    const settings = this.getSettings();
    const providers = this.getActiveProviders();

    if (providers.length === 0) {
      console.warn('[AIProviderManager] No active AI providers found.');
      return null;
    }

    // Single mode: only use default provider (or first active)
    if (settings.mode === 'single') {
      const target = providers.find((p) => p.name === settings.default_provider) || providers[0];
      return await this.callProvider(target, prompt, feature);
    }

    // Parallel failover mode: try providers in order of priority until one succeeds
    for (const provider of providers) {
      try {
        const result = await this.callProvider(provider, prompt, feature);
        if (result) return result;
      } catch (err) {
        console.warn(`[AIProviderManager] Provider ${provider.name} failed, trying next failover...`, err);
      }
    }

    return null;
  }

  /**
   * Invokes a specific provider adapter with latency tracking and telemetry logging
   */
  static async callProvider(
    provider: AIProviderConfig,
    prompt: string,
    feature: AIFeature
  ): Promise<string | null> {
    const startTime = Date.now();
    let status: 'success' | 'failed' | 'fallback_triggered' = 'success';
    let errorMessage: string | undefined;
    let outputText: string | null = null;
    const apiKey = provider.api_key_encrypted || '';

    try {
      if (provider.name === 'gemini') {
        outputText = await this.callGemini(apiKey, provider.model_text || 'gemini-1.5-flash', prompt);
      } else if (provider.name === 'openai') {
        outputText = await this.callOpenAI(apiKey, provider.model_text || 'gpt-4o-mini', prompt);
      } else if (provider.name === 'deepseek') {
        outputText = await this.callDeepSeek(apiKey, provider.model_text || 'deepseek-chat', prompt);
      } else {
        throw new Error(`Unsupported provider name: ${provider.name}`);
      }

      if (!outputText) {
        status = 'failed';
        errorMessage = 'Provider returned empty response';
      }
    } catch (err: unknown) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : 'Unknown provider error';
    } finally {
      const latencyMs = Date.now() - startTime;
      const promptTokens = Math.max(1, Math.round(prompt.length / 4));
      const completionTokens = outputText ? Math.max(1, Math.round(outputText.length / 4)) : 0;

      const logEntry: AILog = {
        id: 'ailog-' + Math.random().toString(36).substring(2, 9),
        provider: provider.name,
        providerName: provider.display_name || provider.displayName || provider.name,
        feature,
        endpointType: feature === 'telegram_receipt' ? 'vision_receipt' : feature === 'telegram_voice' ? 'speech_transcribe' : 'text_parser',
        prompt_tokens: promptTokens,
        promptTokens,
        completion_tokens: completionTokens,
        completionTokens,
        latency_ms: latencyMs,
        latencyMs,
        status,
        error_message: errorMessage,
        errorMessage,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      mockStore.aiLogs.unshift(logEntry);
      if (dataStore && Array.isArray(dataStore.aiLogs)) {
        dataStore.aiLogs.unshift(logEntry);
      }
    }

    return outputText;
  }

  /**
   * Structured JSON extraction for natural language transactions
   * Extracts { jenis, nominal, kategori, catatan, dompet, is_ambiguous }
   * using multi-provider LLM with resilient heuristic fallback
   */
  static async extractStructuredTransaction(
    text: string,
    options?: { preferredProvider?: string; preferredWallet?: string }
  ): Promise<ParsedTransaction> {
    const clean = text.trim();
    const prompt = `Anda adalah sistem parser transaksi keuangan Indonesia untuk TataDana.
Analisis pesan berikut dan ekstrak ke JSON terstruktur:
Pesan: "${clean}"

Format JSON yang WAJIB dihasilkan:
{
  "jenis": "expense" | "income",
  "nominal": number (angka bulat IDR murni tanpa titik atau singkatan, contoh: "15rb" -> 15000, "1.5jt" -> 1500000, "500k" -> 500000),
  "kategori": string (contoh: "Makanan & Minuman", "Transportasi", "Belanja", "Tagihan & Utilitas", "Hiburan", "Kesehatan", "Gaji & Upah", "Freelance & Side Hustle"),
  "catatan": string,
  "dompet": string (contoh: "Dompet Tunai", "BCA", "Mandiri", "GoPay", "OVO", "DANA"),
  "is_ambiguous": boolean
}
Hanya kembalikan string JSON valid tanpa markdown formatting.`;

    let llmResult: string | null = null;
    try {
      if (options?.preferredProvider) {
        const p = mockStore.aiProviders.get(options.preferredProvider);
        if (p) {
          llmResult = await this.callProvider(p, prompt, 'telegram_text');
        }
      }
      if (!llmResult) {
        llmResult = await this.executeTextGeneration(prompt, 'telegram_text');
      }

      if (llmResult) {
        const cleanedJson = llmResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        if (parsed && typeof parsed.nominal === 'number' && parsed.nominal > 0) {
          const detectedWallet = inferWallet(clean);
          const resolvedWallet = parsed.dompet || detectedWallet?.walletName || options?.preferredWallet || 'BCA Utama';
          return {
            type: parsed.jenis === 'income' ? 'income' : 'expense',
            amount: parsed.nominal,
            category: parsed.kategori || 'Pengeluaran Umum',
            categoryName: parsed.kategori || 'Pengeluaran Umum',
            notes: parsed.catatan || clean,
            description: parsed.catatan || clean,
            wallet: resolvedWallet,
            walletName: resolvedWallet,
            walletKeyword: detectedWallet?.walletKeyword,
            confidence: 0.98,
            is_ambiguous: !!parsed.is_ambiguous,
            isAmbiguous: !!parsed.is_ambiguous,
          };
        }
      }
    } catch (e) {
      console.warn('[AIProviderManager] Structured LLM extraction failed, using resilient heuristic fallback:', e);
    }

    // Resilient heuristic fallback
    return await parseTransactionWithAI(clean, { preferredWallet: options?.preferredWallet });
  }
}
