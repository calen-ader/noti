import { NotFound } from '@/components/NotFound';
import { supabaseServer } from '@/lib/supabase/server';
import { Studio } from '@/studio/Studio';

export const dynamic = 'force-dynamic';

// The link students get: what was last published, no account needed.
export default async function ProjectLink({ params }: { params: Promise<{ token: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.rpc('published_project', { p_token: (await params).token });
  return data ? <Studio mode="student" data={data} /> : <NotFound />;
}
