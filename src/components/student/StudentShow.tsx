'use client';

import { useEffect, useMemo, useState } from 'react';
import { linesFor } from '@/lib/sheet/anchoring';
import type { Id } from '@/lib/sheet/types';
import type { Show, Song } from '@/lib/show/types';
import { SheetView } from '../editor/SheetView';
import styles from './StudentShow.module.css';

// What a student sees from a show or song link. They say who they are once (remembered on
// this device only), and their lines stand out. Lines that changed since their last visit are marked.

type Props = { show: Show; revision: number; publishedAt: string; note?: string | null; only?: Id };

const keyFor = (showId: Id) => `noti-me-${showId}`;
const seenKey = (showId: Id) => `noti-seen-${showId}`;

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}

export function StudentShow({ show, revision, publishedAt, note, only }: Props) {
  const [me, setMe] = useState<Id | null>(null);
  const [ready, setReady] = useState(false);
  const [changed, setChanged] = useState<Set<Id>>(new Set());

  useEffect(() => {
    // Device-only memory: who this student is, and the line texts they saw last time.
    /* eslint-disable react-hooks/set-state-in-effect */
    setMe(read(keyFor(show.id)));
    const seen = JSON.parse(read(seenKey(show.id)) ?? 'null') as { rev: number; lines: Record<Id, string> } | null;
    const now: Record<Id, string> = {};
    for (const s of show.songs) for (const sec of s.lyrics.sections) for (const l of sec.lines) now[l.id] = l.text;
    if (seen && seen.rev !== revision) setChanged(new Set(Object.keys(now).filter((id) => seen.lines[id] !== now[id])));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    write(seenKey(show.id), JSON.stringify({ rev: revision, lines: now }));
  }, [show, revision]);

  const groupsOf = (p: Id) => show.groups.filter((g) => g.members.includes(p)).map((g) => g.id);
  const songs = only ? show.songs.filter((s) => s.id === only) : show.songs;
  const mine = useMemo(() => {
    if (!me) return new Map<Id, Set<Id>>();
    return new Map(songs.map((s) => [s.id, linesFor(s.lyrics, me, groupsOf)]));
  }, [me, songs]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = me && !only
    ? [...songs].sort((a, b) => Number((mine.get(b.id)?.size ?? 0) > 0) - Number((mine.get(a.id)?.size ?? 0) > 0))
    : songs;

  function pick(id: Id | null) {
    setMe(id);
    if (id) write(keyFor(show.id), id); else write(keyFor(show.id), '');
  }

  const meName = show.people.find((p) => p.id === me)?.name;
  const date = new Date(publishedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{only ? show.title : `Actualizado ${date}`}</p>
        <h1 className={styles.title}>{only ? songs[0]?.title : show.title}</h1>
        {note && !only && <p className={styles.note}>{note}</p>}
      </header>

      {ready && (
        <section className={styles.who}>
          <label htmlFor="who">¿Quién sos?</label>
          <select id="who" value={me ?? ''} onChange={(e) => pick(e.target.value || null)}>
            <option value="">Ver todo</option>
            {show.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {meName && <p className={styles.hint}>Tus partes están resaltadas. Lo demás queda de fondo para que sepas cuándo entrás.</p>}
        </section>
      )}

      {changed.size > 0 && <p className={styles.changed}>Hay cambios desde tu última visita. Los renglones nuevos o corregidos están marcados con un punto.</p>}

      {!only && (
        <nav className={styles.toc} aria-label="Canciones">
          <ol>
            {ordered.map((s) => (
              <li key={s.id}>
                <a href={`#c-${s.id}`}>
                  {s.title}
                  {me && (mine.get(s.id)?.size ?? 0) > 0 && <span className={styles.yours}> · cantás</span>}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {ordered.map((s) => (
        <SongBlock key={s.id} song={s} show={show} focus={me ? mine.get(s.id) : undefined} changed={changed} heading={!only} />
      ))}
    </main>
  );
}

function SongBlock({ song, show, focus, changed, heading }: { song: Song; show: Show; focus?: Set<Id>; changed: Set<Id>; heading: boolean }) {
  const position = show.songs.findIndex((s) => s.id === song.id) + 1;
  return (
    <article id={`c-${song.id}`} className={styles.song}>
      {heading && (
        <h2 className={styles.songTitle}>
          <span className={styles.num}>{position}</span> {song.title}
        </h2>
      )}
      <SheetView doc={song.lyrics} people={show.people} groups={show.groups} selection={null} focus={focus} changed={changed} />
    </article>
  );
}
