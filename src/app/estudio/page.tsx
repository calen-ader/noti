import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/client';
import { supabaseServer } from '@/lib/supabase/server';
import { NewShow } from './NewShow';
import styles from './estudio.module.css';

export const dynamic = 'force-dynamic';

export default async function Studio() {
  if (!supabaseConfigured) redirect('/');
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/');
  const { data: shows } = await supabase.from('shows').select('id, title, show_date').order('created_at', { ascending: false });

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <span className={styles.brand}>Noti</span>
        <span className={styles.who}>{data.user.email}</span>
      </header>
      <h1 className={styles.h1}>Tus muestras</h1>
      {shows?.length ? (
        <ul className={styles.list}>
          {shows.map((s) => (
            <li key={s.id}><Link href={`/estudio/${s.id}`} className={styles.show}>{s.title}</Link></li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Todavía no hay muestras. Creá la primera y después agregá alumnos y canciones.</p>
      )}
      <NewShow />
    </main>
  );
}
