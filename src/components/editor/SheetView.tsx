'use client';

import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { lineOrder } from '@/lib/sheet/anchoring';
import { songColors } from '@/lib/sheet/colors';
import { lineSegments, marginLabels, overlays } from '@/lib/sheet/ops';
import type { Id, LyricsDoc } from '@/lib/sheet/types';
import type { Group, Person } from '@/lib/show/types';
import styles from './SheetView.module.css';

// The sheet is a fixed-shape page: lines never wrap, and the whole page scales to the width
// it gets. That keeps every line, highlight and pen stroke in the same place on an iPad, a
// laptop or a phone.

export type Selection =
  | { kind: 'lines'; from: Id; to: Id }
  | { kind: 'words'; line: Id; start: number; end: number }
  | null;

type Props = {
  doc: LyricsDoc;
  people: Person[];
  groups: Group[];
  selection: Selection;
  onSelect?: (s: Selection) => void;
  /** Lines to keep at full strength; the rest fade. Used by the student view. */
  focus?: Set<Id>;
  /** Draws a gutter with line handles and makes words tappable. */
  interactive?: boolean;
  onEditSection?: (section: Id) => void;
};

const WORD = /\S+/g;

export function whoLabel(a: { people: Id[]; groups: Id[] }, people: Person[], groups: Group[]): string {
  const g = a.groups.map((id) => groups.find((x) => x.id === id)?.label).filter(Boolean);
  const p = a.people.map((id) => people.find((x) => x.id === id)?.name).filter(Boolean);
  return [...g, ...p].join(', ');
}

export function SheetView({ doc, people, groups, selection, onSelect, focus, interactive = false, onEditSection }: Props) {
  const colors = useMemo(() => songColors(doc), [doc]);
  const order = useMemo(() => lineOrder(doc), [doc]);
  const brackets = useMemo(() => overlays(doc, colors), [doc, colors]);

  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const natural = inner.current.scrollWidth;
      const s = Math.min(1.25, outer.current.clientWidth / natural);
      setScale(s);
      setHeight(inner.current.scrollHeight * s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current!);
    ro.observe(inner.current!);
    return () => ro.disconnect();
  }, [doc]);

  const selRange = (() => {
    if (selection?.kind !== 'lines') return null;
    const a = order.indexOf(selection.from);
    const b = order.indexOf(selection.to);
    return [Math.min(a, b), Math.max(a, b)] as const;
  })();

  function tapLine(id: Id) {
    if (!onSelect) return;
    if (selection?.kind === 'lines') {
      const single = selection.from === selection.to;
      if (single && selection.from === id) return onSelect(null);
      if (single) return onSelect({ kind: 'lines', from: selection.from, to: id });
    }
    onSelect({ kind: 'lines', from: id, to: id });
  }

  function tapWord(line: Id, start: number, end: number) {
    if (!onSelect) return;
    if (selection?.kind === 'words' && selection.line === line) {
      if (selection.start === start && selection.end === end) return onSelect(null);
      return onSelect({ kind: 'words', line, start: Math.min(selection.start, start), end: Math.max(selection.end, end) });
    }
    onSelect({ kind: 'words', line, start, end });
  }

  return (
    <div ref={outer} className={styles.outer} style={{ height }}>
      <div ref={inner} className={styles.page} style={{ transform: `scale(${scale})` }}>
        {doc.sections.map((section) => (
          <section key={section.id} className={styles.section}>
            {(section.label || interactive) && (
              <div className={styles.sectionRow}>
                <span className={styles.gutter} />
                <button
                  type="button"
                  className={styles.sectionLabel}
                  onClick={() => onEditSection?.(section.id)}
                  disabled={!onEditSection}
                >
                  {section.label || 'Sin nombre'}
                </button>
              </div>
            )}
            {section.lines.map((line) => {
              const i = order.indexOf(line.id);
              const inRange = selRange && i >= selRange[0] && i <= selRange[1];
              const faded = focus && !focus.has(line.id);
              const labels = marginLabels(doc, line.id);
              const notes = doc.notes.filter((n) => n.anchor.kind === 'after' && n.anchor.line === line.id);
              const lineBrackets = brackets.filter((b) => order.indexOf(b.from) <= i && i <= order.indexOf(b.to));
              return (
                <Fragment key={line.id}>
                  <div className={`${styles.line} ${inRange ? styles.selected : ''} ${faded ? styles.faded : ''}`} data-line={line.id}>
                    {interactive ? (
                      <button type="button" className={styles.gutter} onClick={() => tapLine(line.id)} aria-label={`Elegir renglón ${i + 1}`}>
                        {i + 1}
                      </button>
                    ) : (
                      <span className={styles.gutter} />
                    )}
                    <span className={`${styles.text} ${line.added ? styles.added : ''}`}>
                      {lineSegments(doc, line.id, colors).map((seg) => (
                        <span
                          key={seg.start}
                          className={styles.seg}
                          style={seg.fills.length ? { background: fillOf(seg.fills) } : undefined}
                        >
                          {interactive ? words(seg.text, seg.start).map((w) => {
                            const picked = selection?.kind === 'words' && selection.line === line.id && w.start >= selection.start && w.end <= selection.end;
                            return w.word ? (
                              <span
                                key={w.start}
                                className={`${styles.word} ${picked ? styles.picked : ''}`}
                                onClick={() => tapWord(line.id, w.start, w.end)}
                              >
                                {w.text}
                              </span>
                            ) : (
                              <Fragment key={w.start}>{w.text}</Fragment>
                            );
                          }) : seg.text}
                        </span>
                      ))}
                    </span>
                    <span className={styles.names}>
                      {brackets.filter((b) => b.from === line.id).map((b) => (
                        <span key={b.id} className={styles.name}>{whoLabel(b.who, people, groups)} armonía</span>
                      ))}
                      {labels.map((a) => (
                        <span key={a.id} className={`${styles.name} ${a.needsCheck ? styles.check : ''}`}>
                          {a.role === 'everyone' ? 'Todxs' : whoLabel(a, people, groups)}
                          {a.role === 'solo' && ' (solo)'}
                          {a.role === 'coro' && ' (coro)'}
                          {a.role === 'echo' && ' (eco)'}
                        </span>
                      ))}
                    </span>
                    <span className={styles.brackets}>
                      {lineBrackets.map((b) => {
                        const first = b.from === line.id;
                        const last = b.to === line.id;
                        return <span key={b.id} className={styles.bracket} data-first={first} data-last={last} />;
                      })}
                    </span>
                  </div>
                  {notes.map((n) => (
                    <div key={n.id} className={styles.note}>
                      <span className={styles.gutter} />
                      <span>{n.body}</span>
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

function fillOf(fills: string[]): string {
  if (fills.length === 1) return `var(--hl-${fills[0]})`;
  // Two or more singers on the same words: stacked bands, like two highlighters over each other.
  const step = 100 / fills.length;
  return `linear-gradient(${fills.map((f, i) => `var(--hl-${f}) ${i * step}% ${(i + 1) * step}%`).join(', ')})`;
}

function words(text: string, offset: number) {
  const out: { text: string; start: number; end: number; word: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), start: offset + last, end: offset + m.index, word: false });
    out.push({ text: m[0], start: offset + m.index, end: offset + m.index + m[0].length, word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), start: offset + last, end: offset + text.length, word: false });
  return out;
}
