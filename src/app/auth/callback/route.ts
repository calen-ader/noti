import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// The emailed sign-in link lands here with a one-time code, and goes on to where the person was headed
// (a project's join link, say), which the sign-in page left in a cookie.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = decodeURIComponent(request.cookies.get('noti-next')?.value ?? '');
  const to = next.startsWith('/') && !next.startsWith('//') ? next : '/estudio';
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(new URL(to, url.origin));
      res.cookies.delete('noti-next');
      return res;
    }
  }
  return NextResponse.redirect(new URL('/?error=link', url.origin));
}
