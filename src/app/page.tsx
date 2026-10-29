import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { Studio } from '@/studio/Studio';

export const dynamic = 'force-dynamic';

const safeNext = (n: string | undefined) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

// Sign-in: whoever edits gets an emailed link. Students never sign in; they open the link they were sent.
export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; code?: string }> }) {
  const sp = await searchParams;
  // a sign-in link that came back to the home page instead of /auth/callback still works
  if (sp.code) redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  const next = safeNext(sp.next);
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (data.user) redirect(next ?? '/estudio');
  return <Studio mode="signin" next={next} />;
}
