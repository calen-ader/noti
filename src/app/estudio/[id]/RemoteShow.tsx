'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShowWorkspace } from '@/components/show/ShowWorkspace';
import type { Id } from '@/lib/sheet/types';
import { loadShow, publish, syncShow, type Remote } from '@/lib/show/remote';
import type { Show } from '@/lib/show/types';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../estudio.module.css';
import own from './remote.module.css';

type Status = 'loading' | 'saved' | 'saving' | 'error' | 'stale';

export function RemoteShow({ id }: { id: Id }) {
  const [sb] = useState(supabaseBrowser);
  const [show, setShow] = useState<Show | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [links, setLinks] = useState<Remote['links'] | null>(null);
  const saved = useRef<{ show: Show; remote: Remote; studio: Id } | null>(null);
  const queue = useRef(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadShow(sb, id).then((r) => {
      saved.current = r;
      setShow(r.show);
      setLinks(r.remote.links);
      setStatus('saved');
    }).catch(() => setStatus('error'));
  }, [sb, id]);

  const flush = useCallback((next: Show) => {
    queue.current = queue.current.then(async () => {
      const base = saved.current;
      if (!base || base.show === next) return;
      setStatus('saving');
      try {
        const remote = await syncShow(sb, base.studio, base.show, next, base.remote);
        saved.current = { ...base, show: next, remote };
        setLinks(remote.links);
        setStatus('saved');
      } catch (e) {
        setStatus((e as Error).message === 'stale' ? 'stale' : 'error');
      }
    });
    return queue.current;
  }, [sb]);

  function change(next: Show) {
    setShow(next);
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(next), 700);
  }

  if (!show) {
    return <main className={styles.page}><p className={styles.hint}>{status === 'error' ? 'No pudimos abrir esta muestra.' : 'Abriendo…'}</p></main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/estudio" className={styles.brand}>Noti</Link>
        <span className={own.status} data-status={status}>
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado' : status === 'stale'
            ? 'Esta muestra cambió en otra pestaña. Recargá la página antes de seguir.'
            : 'No se pudo guardar. Revisá la conexión.'}
        </span>
      </header>
      <ShowWorkspace
        show={show}
        onChange={change}
        extra={(songId) => (
          <Share
            links={links}
            songId={songId}
            onPublish={async (note) => {
              clearTimeout(timer.current);
              await flush(show);
              return publish(sb, show, note);
            }}
          />
        )}
      />
    </main>
  );
}

function Share({ links, songId, onPublish }: { links: Remote['links'] | null; songId: Id | null; onPublish: (note: string) => Promise<number> }) {
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const showUrl = links ? `${origin}/m/${links.show}` : '';
  const songUrl = links && songId && links.songs[songId] ? `${origin}/c/${links.songs[songId]}` : '';

  return (
    <div className={own.share}>
      <form className={own.publish} onSubmit={async (e) => {
        e.preventDefault();
        setState('busy');
        try { await onPublish(note.trim()); setNote(''); setState('done'); } catch { setState('error'); }
      }}>
        <label htmlFor="publish-note">Qué cambió (opcional)</label>
        <input id="publish-note" value={note} onChange={(e) => { setNote(e.target.value); setState('idle'); }} placeholder="Nuevo orden, Mateo canta el puente…" />
        <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? 'Publicando…' : 'Publicar para alumnos'}</button>
        {state === 'done' && <p className={own.ok} role="status">Publicado. Los alumnos ya ven esta versión.</p>}
        {state === 'error' && <p className={own.bad}>No se pudo publicar. Probá de nuevo.</p>}
      </form>
      {showUrl && <CopyLink label="Link de la muestra" url={showUrl} />}
      {songUrl && <CopyLink label="Link de esta canción" url={songUrl} />}
    </div>
  );
}

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={own.copy}>
      <span>{label}</span>
      <code>{url}</code>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
      }}>{copied ? 'Copiado' : 'Copiar'}</button>
    </div>
  );
}
