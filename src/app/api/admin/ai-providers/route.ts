import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';
import { AIMode, AIProviderConfig } from '@/lib/types';

export async function GET() {
  const providers = Array.from(mockStore.aiProviders.values()).sort((a, b) => a.priority - b.priority);
  return NextResponse.json({
    providers,
    settings: mockStore.aiSettings,
  });
}

export async function PUT(request: Request) {
  try {
    const { mode, defaultProvider, providerUpdates, newProvider } = await request.json();

    if (mode && (mode === 'single' || mode === 'parallel_failover' || mode === 'failover')) {
      const normalizedMode = mode === 'failover' ? 'parallel_failover' : mode;
      mockStore.aiSettings.mode = normalizedMode as AIMode;
      dataStore.aiMode = (normalizedMode === 'parallel_failover' ? 'failover' : 'single') as any;
    }
    if (defaultProvider) {
      mockStore.aiSettings.default_provider = defaultProvider;
    }
    mockStore.aiSettings.updated_at = new Date().toISOString();

    if (providerUpdates && Array.isArray(providerUpdates)) {
      for (const update of providerUpdates) {
        const p = mockStore.aiProviders.get(update.name);
        if (p) {
          if (update.api_key_encrypted !== undefined) p.api_key_encrypted = update.api_key_encrypted;
          if (update.is_active !== undefined) p.is_active = Boolean(update.is_active);
          if (update.priority !== undefined) p.priority = Number(update.priority);
          if (update.model_text) p.model_text = update.model_text;
          p.updated_at = new Date().toISOString();
        }
      }
    }

    if (newProvider && newProvider.name) {
      const p: AIProviderConfig = {
        id: 'p-' + Math.random().toString(36).substring(2, 9),
        name: newProvider.name,
        display_name: newProvider.display_name || newProvider.name,
        api_key_encrypted: newProvider.api_key_encrypted || '',
        is_active: true,
        priority: mockStore.aiProviders.size + 1,
        model_text: newProvider.model_text || 'default-model',
        model_vision: newProvider.model_vision || 'default-model',
        model_audio: newProvider.model_audio || 'default-model',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockStore.aiProviders.set(p.name, p);
    }

    // Audit log
    mockStore.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      admin_id: 'admin-001',
      action: 'UPDATE_AI_CONFIGURATION',
      details: { mode, defaultProvider },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      providers: Array.from(mockStore.aiProviders.values()),
      settings: mockStore.aiSettings,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update konfigurasi AI' }, { status: 500 });
  }
}
