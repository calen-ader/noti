'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createShow } from '@/lib/show/remote';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './estudio.module.css';

export function NewShow() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <form className={styles.inline} onSubmit={async (e) => {
      e.preventDefault();
      if (!title.trim()) return;
      setBusy(true);
      try {
        const id = await createShow(supabaseBrowser(), title.trim());
        router.push(`/estudio/${id}`);
      } catch {
        setError('No se pudo crear la muestra. Probá de nuevo.');
        setBusy(false);
      }
    }}>
      <input aria-label="Nombre de la muestra" placeholder="Muestra 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" disabled={busy}>Crear muestra</button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
