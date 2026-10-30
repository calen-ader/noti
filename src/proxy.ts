import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SIGNED_IN = /^\/($|estudio|unirse)/;

// Every page gets a Content-Security-Policy: only scripts carrying this request's nonce (Next adds it to its own)
// may run, so text that sneaks into a page can't run as code. Pages are rendered per request, so the nonce is fresh.
function policy(nonce: string) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const dev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src 'self' ${supabase} ${supabase.replace(/^https:/, 'wss:')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = policy(nonce);
  const next = () => {
    const headers = new Headers(request.headers); // read again each time: the session refresh below may change cookies
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };
  let response = next();
  // Keeps the sign-in fresh: pages can read the session but can't write cookies, so the refresh happens here.
  if (!SIGNED_IN.test(request.nextUrl.pathname) || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

// everything but Next's built files and the plain files in public/
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|mail/|logo-parts.svg).*)'] };
