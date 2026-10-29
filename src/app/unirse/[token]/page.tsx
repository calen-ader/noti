import { redirect } from 'next/navigation';
import { NotFound } from '@/components/NotFound';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// The link for someone who will edit: they sign in with their mail and the project shows up in their sidebar.
export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect(`/?next=${encodeURIComponent(`/unirse/${token}`)}`);
  const { data: pid } = await sb.rpc('join_project', { p_token: token });
  if (!pid) return <NotFound />;
  redirect(`/estudio?p=${encodeURIComponent(pid)}`);
}
