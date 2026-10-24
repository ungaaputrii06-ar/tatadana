import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Handle Supabase OAuth / Magic link exchange if code present
  if (code) {
    // In production, exchange code for session with Supabase client
    return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.redirect(new URL('/dashboard', req.url));
}
