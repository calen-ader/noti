'use client';

import { useMemo, useState } from 'react';
import { linesFor } from '@/lib/sheet/anchoring';
import { newId } from '@/lib/sheet/ids';
import { lyricsFromPaste } from '@/lib/sheet/paste';
import type { Id, LyricsDoc } from '@/lib/sheet/types';
import type { Show } from '@/lib/show/types';
import { SheetView } from '../editor/SheetView';
import { SongEditor } from '../editor/SongEditor';
import styles from './ShowWorkspace.module.css';

type Panel = { kind: 'song'; id: Id } | { kind: 'new' } | { kind: 'roster' } | { kind: 'preview'; id: Id };

export function ShowWorkspace({ show, onChange, extra }: { show: Show; onChange: (s: Show) => void; extra?: (songId: Id | null) => React.ReactNode }) {
  const [panel, setPanel] = useState<Panel>(show.songs[0] ? { kind: 'song', id: show.songs[0].id } : { kind: 'new' });
  const song = panel.kind === 'song' || panel.kind === 'preview' ? show.songs.find((s) => s.id === panel.id) : undefined;

  function updateSong(id: Id, lyrics: LyricsDoc) {
    onChange({ ...show, songs: show.songs.map((s) => (s.id === id ? { ...s, lyrics } : s)) });
  }

  function move(id: Id, by: number) {
    const songs = [...show.songs];
    const i = songs.findIndex((s) => s.id === id);
    const j = i + by;
    if (j < 0 || j >= songs.length) return;
    [songs[i], songs[j]] = [songs[j], songs[i]];
    onChange({ ...show, songs });
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.side} aria-label="Muestra">
        <p className={styles.showTitle}>{show.title}</p>
        <ol className={styles.setlist}>
          {show.songs.map((s, i) => (
            <li key={s.id} className={styles.item}>
              <button
                className={styles.songBtn}
                aria-current={song?.id === s.id}
                onClick={() => setPanel({ kind: 'song', id: s.id })}
              >
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.songTitle}>{s.title}</span>
              </button>
              <span className={styles.reorder}>
                <button aria-label={`Subir ${s.title}`} onClick={() => move(s.id, -1)} disabled={i === 0}>↑</button>
                <button aria-label={`Bajar ${s.title}`} onClick={() => move(s.id, 1)} disabled={i === show.songs.length - 1}>↓</button>
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.sideActions}>
          <button className={styles.link} onClick={() => setPanel({ kind: 'new' })}>Agregar canción</button>
          <button className={styles.link} onClick={() => setPanel({ kind: 'roster' })}>Alumnos y micrófonos</button>
        </div>
        {extra?.(song?.id ?? null)}
      </nav>

      <div className={styles.main}>
        {panel.kind === 'new' && (
          <NewSong
            onAdd={(title, raw) => {
              const s = { id: newId(), title, lyrics: lyricsFromPaste(raw) };
              onChange({ ...show, songs: [...show.songs, s] });
              setPanel({ kind: 'song', id: s.id });
            }}
          />
        )}
        {panel.kind === 'roster' && <Roster show={show} onChange={onChange} />}
        {song && (
          <>
            <header className={styles.songHead}>
              <h1 className={styles.h1}>{song.title}</h1>
              <div className={styles.tabs}>
                <button className={styles.link} aria-pressed={panel.kind === 'song'} onClick={() => setPanel({ kind: 'song', id: song.id })}>Editar</button>
                <button className={styles.link} aria-pressed={panel.kind === 'preview'} onClick={() => setPanel({ kind: 'preview', id: song.id })}>Ver como alumno</button>
              </div>
            </header>
            {panel.kind === 'song' ? (
              <SongEditor key={song.id} doc={song.lyrics} people={show.people} groups={show.groups} onChange={(d) => updateSong(song.id, d)} />
            ) : (
              <Preview show={show} doc={song.lyrics} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Preview({ show, doc }: { show: Show; doc: LyricsDoc }) {
  const [person, setPerson] = useState<Id>('');
  const groupsOf = (p: Id) => show.groups.filter((g) => g.members.includes(p)).map((g) => g.id);
  const focus = useMemo(() => (person ? linesFor(doc, person, groupsOf) : undefined), [doc, person]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={styles.preview}>
      <label className={styles.field}>
        <span>Ver como</span>
        <select value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">Toda la canción</option>
          {show.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className={styles.phone}>
        <SheetView doc={doc} people={show.people} groups={show.groups} selection={null} focus={focus} />
      </div>
    </div>
  );
}

function NewSong({ onAdd }: { onAdd: (title: string, lyrics: string) => void }) {
  const [title, setTitle] = useState('');
  const [raw, setRaw] = useState('');
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); if (title.trim() && raw.trim()) onAdd(title.trim(), raw); }}>
      <h1 className={styles.h1}>Canción nueva</h1>
      <label className={styles.field}>
        <span>Nombre</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className={styles.field}>
        <span>Letra</span>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={14} required
          placeholder={'Pegá la letra acá.\nUn renglón vacío separa secciones.\nUn renglón como [Estribillo] le pone nombre a la sección que sigue.'} />
      </label>
      <button className={styles.solid} type="submit">Crear canción</button>
    </form>
  );
}

function Roster({ show, onChange }: { show: Show; onChange: (s: Show) => void }) {
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const toggle = (g: Id, p: Id) =>
    onChange({ ...show, groups: show.groups.map((x) => (x.id !== g ? x : { ...x, members: x.members.includes(p) ? x.members.filter((m) => m !== p) : [...x.members, p] })) });
  const editable = show.groups.filter((g) => g.kind !== 'everyone');

  return (
    <div className={styles.roster}>
      <h1 className={styles.h1}>Alumnos y micrófonos</h1>
      <p className={styles.hint}>Solo el nombre de pila. Todxs incluye a todos automáticamente.</p>
      <form className={styles.inline} onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const p = { id: newId(), name: name.trim() };
        onChange({ ...show, people: [...show.people, p], groups: show.groups.map((g) => (g.kind === 'everyone' ? { ...g, members: [...g.members, p.id] } : g)) });
        setName('');
      }}>
        <input aria-label="Nombre" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <button className={styles.solid} type="submit">Agregar</button>
      </form>
      <form className={styles.inline} onSubmit={(e) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        onChange({ ...show, groups: [...show.groups, { id: newId(), kind: 'mic', label: groupName.trim(), members: [] }] });
        setGroupName('');
      }}>
        <input aria-label="Grupo nuevo" placeholder="Mic 5, Voces agudas…" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        <button className={styles.solid} type="submit">Agregar grupo</button>
      </form>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Alumno</th>{editable.map((g) => <th key={g.id}>{g.label}</th>)}</tr>
          </thead>
          <tbody>
            {show.people.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                {editable.map((g) => (
                  <td key={g.id}>
                    <input type="checkbox" aria-label={`${p.name} en ${g.label}`} checked={g.members.includes(p.id)} onChange={() => toggle(g.id, p.id)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
