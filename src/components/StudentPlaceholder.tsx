import { supabaseConfigured } from '@/lib/supabase/client';
import { supabaseServer } from '@/lib/supabase/server';
import styles from '@/app/placeholder.module.css';

type Published = { title?: string; song?: { title?: string } } | null;

export async function StudentPlaceholder({ rpc, token, pick }: { rpc: 'published_show' | 'published_song'; token: string; pick: (d: Published) => string | undefined }) {
  let title: string | undefined;
  if (supabaseConfigured) {
    const { data } = await (await supabaseServer()).rpc(rpc, { p_token: token });
    title = pick(data as Published);
  }

  return (
    <main className={styles.page}>
      {title ? (
        <h1 className={styles.title}>{title}</h1>
      ) : (
        <>
          <h1 className={styles.title}>Este link no lleva a ninguna hoja.</h1>
          <p>Pedile a tu profe el link de nuevo. Si la hoja es nueva, puede que todavía no esté publicada.</p>
        </>
      )}
    </main>
  );
}
