import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/client';
import { supabaseServer } from '@/lib/supabase/server';
import { RemoteShow } from './RemoteShow';

export const dynamic = 'force-dynamic';

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) redirect('/');
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) redirect('/');
  const { id } = await params;
  return <RemoteShow id={id} />;
}
