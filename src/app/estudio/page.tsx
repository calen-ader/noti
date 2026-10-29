import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { loadStudio } from '@/studio/store';
import { Studio } from '@/studio/Studio';

export const dynamic = 'force-dynamic';

export default async function Estudio({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/');
  const studio = await loadStudio(sb, data.user.id);
  const me = { id: data.user.id, email: data.user.email ?? '', name: studio.profile?.name ?? '' };
  return <Studio mode="studio" me={me} data={studio} open={(await searchParams).p ?? null} />;
}
