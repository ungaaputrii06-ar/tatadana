import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';
import { AILog } from '@/lib/types';

export async function GET() {
  const seenIds = new Set<string>();
  const combined: AILog[] = [];

  const addLog = (l: AILog) => {
    if (!seenIds.has(l.id)) {
      seenIds.add(l.id);
      const promptText =
        l.prompt ||
        l.prompt_text ||
        (l.feature === 'vision_receipt'
          ? 'Ekstraksi Foto Struk Belanja OCR'
          : l.feature === 'speech_transcribe'
          ? 'Transkripsi Voice Note Audio'
          : l.feature === 'financial_advisor'
          ? 'Analisis & Saran Keuangan Cerdas'
          : 'Parsing Transaksi Natural Language');

      combined.push({
        ...l,
        prompt: promptText,
        prompt_text: promptText,
        prompt_tokens: l.prompt_tokens ?? l.promptTokens ?? 0,
        completion_tokens: l.completion_tokens ?? l.completionTokens ?? 0,
        latency_ms: l.latency_ms ?? l.latencyMs ?? 0,
        provider: l.provider || l.providerName || 'gemini',
        status: l.status || 'success',
      });
    }
  };

  // 1. mockStore logs
  for (const l of mockStore.aiLogs) {
    addLog(l);
  }

  // 2. dataStore logs
  if (dataStore && Array.isArray(dataStore.aiLogs)) {
    for (const l of dataStore.aiLogs) {
      addLog(l);
    }
  }

  // Sort descending by created_at
  combined.sort(
    (a, b) =>
      new Date(b.created_at || b.createdAt || 0).getTime() -
      new Date(a.created_at || a.createdAt || 0).getTime()
  );

  return NextResponse.json({ ok: true, logs: combined });
}
