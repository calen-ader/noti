import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/client';
import { supabaseServer } from '@/lib/supabase/server';
import styles from '../placeholder.module.css';

export const dynamic = 'force-dynamic';

// Teacher home. Shows and songs arrive in part 2.
export default async function Studio() {
  if (!supabaseConfigured) redirect('/');
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/');

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Hola, {data.user.email}</h1>
      <p>Acá van a estar tus muestras y canciones.</p>
      <Link href="/">Volver</Link>
    </main>
  );
}
