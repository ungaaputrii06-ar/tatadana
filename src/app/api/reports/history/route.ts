import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-starter-123';

  const history = Array.from(mockStore.exportHistory.values())
    .filter((h) => (h.user_id || h.userId) === userId)
    .sort((a, b) => new Date(b.created_at || b.createdAt || '').getTime() - new Date(a.created_at || a.createdAt || '').getTime());

  return NextResponse.json({ history });
}
