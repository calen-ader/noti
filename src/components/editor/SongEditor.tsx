'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { deleteLine, editLine, mergeWithNext, snapToWords, splitLine, locate } from '@/lib/sheet/anchoring';
import { addNote, clearTarget, insertAddedLine, renameSection, toggleAssignment, type Who } from '@/lib/sheet/ops';
import type { Id, LyricsDoc, Role } from '@/lib/sheet/types';
import type { Group, Person } from '@/lib/show/types';
import { SheetView, type Selection } from './SheetView';
import styles from './SongEditor.module.css';

// Euge's editor: pick lines (number gutter) or words (tap them), then tap who sings them.

type History = { past: LyricsDoc[]; now: LyricsDoc; future: LyricsDoc[] };
type Action = { type: 'set'; doc: LyricsDoc } | { type: 'undo' } | { type: 'redo' };

function history(h: History, a: Action): History {
  switch (a.type) {
    case 'set':
      return a.doc === h.now ? h : { past: [...h.past.slice(-80), h.now], now: a.doc, future: [] };
    case 'undo':
      return h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h;
    case 'redo':
      return h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h;
  }
}

const ROLES: { role: Role; label: string }[] = [
  { role: 'lead', label: 'Canta' },
  { role: 'solo', label: 'Solo' },
  { role: 'coro', label: 'Coro' },
  { role: 'harmony', label: 'Armonía' },
  { role: 'echo', label: 'Eco' },
];

type Draft = { kind: 'note' | 'echo' | 'section'; target: Id; text: string } | null;

// Mount with key={songId}: a different song starts a fresh history.
type Props = {
  doc: LyricsDoc;
  people: Person[];
  groups: Group[];
  onChange: (doc: LyricsDoc) => void;
};

export function SongEditor({ doc, people, groups, onChange }: Props) {
  const [h, dispatch] = useReducer(history, { past: [], now: doc, future: [] });
  const [mode, setMode] = useState<'assign' | 'text'>('assign');
  const [selection, setSelection] = useState<Selection>(null);
  const [role, setRole] = useState<Role>('lead');
  const [draft, setDraft] = useState<Draft>(null);

  useEffect(() => {
    if (h.now !== doc) onChange(h.now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.now]);

  const set = useCallback((d: LyricsDoc) => dispatch({ type: 'set', doc: d }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      e.preventDefault();
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const target = (() => {
    if (!selection) return null;
    if (selection.kind === 'lines') return { from: selection.from, to: selection.to };
    const line = locate(h.now, selection.line)?.line;
    if (!line) return null;
    const span = snapToWords(line.text, selection.start, selection.end);
    const whole = span.start === 0 && span.end === line.text.length;
    return whole ? { from: line.id, to: line.id } : { from: line.id, to: line.id, span };
  })();

  const lastLine = selection?.kind === 'lines' ? selection.to : selection?.kind === 'words' ? selection.line : null;

  function give(who: Who, r: Role = role) {
    if (!target) return;
    set(toggleAssignment(h.now, target, r, who));
  }

  const everyone = groups.find((g) => g.kind === 'everyone');
  const otherGroups = groups.filter((g) => g.kind !== 'everyone');

  function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.text.trim()) return setDraft(null);
    const text = draft.text.trim();
    if (draft.kind === 'note') set(addNote(h.now, draft.target, text));
    if (draft.kind === 'section') set(renameSection(h.now, draft.target, text));
    if (draft.kind === 'echo') {
      const r = insertAddedLine(h.now, draft.target, text);
      set(r.doc);
      setSelection({ kind: 'lines', from: r.line, to: r.line });
    }
    setDraft(null);
  }

  return (
    <div className={styles.editor}>
      <div className={styles.bar}>
        <div className={styles.tabs} role="tablist" aria-label="Modo">
          <button role="tab" aria-selected={mode === 'assign'} className={styles.tab} onClick={() => setMode('assign')}>Asignar</button>
          <button role="tab" aria-selected={mode === 'text'} className={styles.tab} onClick={() => { setMode('text'); setSelection(null); }}>Texto</button>
        </div>
        <div className={styles.history}>
          <button className={styles.ghost} onClick={() => dispatch({ type: 'undo' })} disabled={!h.past.length}>Deshacer</button>
          <button className={styles.ghost} onClick={() => dispatch({ type: 'redo' })} disabled={!h.future.length}>Rehacer</button>
        </div>
      </div>

      {mode === 'assign' ? (
        <div className={styles.workspace}>
          <div className={styles.sheet}>
            <SheetView
              doc={h.now}
              people={people}
              groups={groups}
              selection={selection}
              onSelect={(s) => { setSelection(s); setDraft(null); }}
              interactive
              onEditSection={(id) => setDraft({ kind: 'section', target: id, text: h.now.sections.find((s) => s.id === id)?.label ?? '' })}
            />
          </div>

          <aside className={styles.palette} aria-label="Quién canta">
            {draft ? (
              <form className={styles.draft} onSubmit={saveDraft}>
                <label htmlFor="draft-text">
                  {draft.kind === 'note' ? 'Nota debajo del renglón' : draft.kind === 'echo' ? 'Renglón nuevo (no está en la letra)' : 'Nombre de la sección'}
                </label>
                <input id="draft-text" autoFocus value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  placeholder={draft.kind === 'note' ? 'abren a 2 voces, 8va ↓…' : draft.kind === 'echo' ? '(will take you away)' : 'Estribillo'} />
                <div className={styles.row}>
                  <button type="submit" className={styles.solid}>Guardar</button>
                  <button type="button" className={styles.ghost} onClick={() => setDraft(null)}>Cancelar</button>
                </div>
              </form>
            ) : !target ? (
              <p className={styles.hint}>Tocá el número de un renglón para elegirlo, y otro número para elegir hasta ahí. Tocá palabras para elegir solo esas.</p>
            ) : (
              <>
                <div className={styles.roles} role="radiogroup" aria-label="Cómo canta">
                  {ROLES.map((r) => (
                    <button key={r.role} role="radio" aria-checked={role === r.role} className={styles.role} onClick={() => setRole(r.role)}>{r.label}</button>
                  ))}
                </div>
                {everyone && (
                  <button className={`${styles.chip} ${styles.everyone}`} onClick={() => give({ people: [], groups: [everyone.id] }, 'everyone')}>Todxs</button>
                )}
                <div className={styles.chips}>
                  {otherGroups.map((g) => (
                    <button key={g.id} className={`${styles.chip} ${styles.group}`} onClick={() => give({ people: [], groups: [g.id] })}>{g.label}</button>
                  ))}
                </div>
                <div className={styles.chips}>
                  {people.map((p) => (
                    <button key={p.id} className={styles.chip} onClick={() => give({ people: [p.id], groups: [] })}>{p.name}</button>
                  ))}
                </div>
                <div className={styles.actions}>
                  <button className={styles.ghost} onClick={() => target && set(clearTarget(h.now, target))}>Borrar colores</button>
                  {lastLine && <button className={styles.ghost} onClick={() => setDraft({ kind: 'note', target: lastLine, text: '' })}>Nota</button>}
                  {lastLine && <button className={styles.ghost} onClick={() => setDraft({ kind: 'echo', target: lastLine, text: '' })}>Agregar renglón</button>}
                </div>
              </>
            )}
          </aside>
        </div>
      ) : (
        <TextMode doc={h.now} onChange={set} />
      )}
    </div>
  );
}

/** Fixing the lyrics. Enter splits a line, Backspace at the start joins it to the one above. */
function TextMode({ doc, onChange }: { doc: LyricsDoc; onChange: (d: LyricsDoc) => void }) {
  const [focusId, setFocusId] = useState<{ id: Id; at: number } | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`line-${focusId.id}`) as HTMLInputElement | null;
    el?.focus();
    el?.setSelectionRange(focusId.at, focusId.at);
  }, [focusId, doc]);

  return (
    <div className={styles.textMode}>
      <p className={styles.hint}>Corregí la letra acá. Los colores y notas siguen pegados a sus renglones.</p>
      {doc.sections.map((s) => (
        <div key={s.id} className={styles.textSection}>
          <span className={styles.textLabel}>{s.label || 'Sin nombre'}</span>
          {s.lines.map((l, i) => (
            <div key={l.id} className={styles.textRow}>
              <input
                id={`line-${l.id}`}
                aria-label={`Renglón ${i + 1}`}
                className={styles.textLine}
                value={l.text}
                onChange={(e) => onChange(editLine(doc, l.id, e.target.value))}
                onKeyDown={(e) => {
                  const el = e.currentTarget;
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const r = splitLine(doc, l.id, el.selectionStart ?? l.text.length);
                    onChange(r.doc);
                    setFocusId({ id: r.newLine, at: 0 });
                  } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
                    e.preventDefault();
                    const prev = s.lines[i - 1];
                    onChange(mergeWithNext(doc, prev.id));
                    setFocusId({ id: prev.id, at: prev.text.length + 1 });
                  }
                }}
              />
              <button className={styles.ghost} onClick={() => onChange(deleteLine(doc, l.id))} aria-label={`Borrar renglón ${i + 1}`}>Borrar</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
