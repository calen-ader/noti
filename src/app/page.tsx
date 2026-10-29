import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/next';
import { supabaseServer } from '@/lib/supabase/server';
import { Studio } from '@/studio/Studio';

export const dynamic = 'force-dynamic';

// Google shows up once it's switched on in Supabase (Authentication > Providers)
async function googleOn() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 60 },
    });
    return Boolean((await r.json())?.external?.google);
  } catch {
    return false;
  }
}

// Sign-in for whoever edits: Google, mail and password, or a mailed link. Students never sign in; they open the link they were sent.
export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; code?: string }> }) {
  const sp = await searchParams;
  // a sign-in link that came back to the home page instead of /auth/callback still works
  if (sp.code) redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  const next = safeNext(sp.next);
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (data.user) redirect(next ?? '/estudio');
  return <Studio mode="signin" next={next} google={await googleOn()} />;
}
