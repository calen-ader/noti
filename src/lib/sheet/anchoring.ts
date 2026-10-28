import { newId } from './ids';
import type { Assignment, Id, Line, LyricsDoc, Note, Span } from './types';

// Editing text under annotations. Line ids are the anchors; character spans are rebased with a
// prefix/suffix diff, then by searching for the quoted text. Anything that can't be placed
// is kept and flagged needsCheck, never dropped.

type Located = { section: number; index: number; line: Line };

export function locate(doc: LyricsDoc, id: Id): Located | null {
  for (let s = 0; s < doc.sections.length; s++) {
    const index = doc.sections[s].lines.findIndex((l) => l.id === id);
    if (index >= 0) return { section: s, index, line: doc.sections[s].lines[index] };
  }
  return null;
}

/** All line ids in reading order. */
export function lineOrder(doc: LyricsDoc): Id[] {
  return doc.sections.flatMap((s) => s.lines.map((l) => l.id));
}

/** Snaps a selection to whole words, so a tap-drag on a tablet never cuts a word in half. */
export function snapToWords(text: string, start: number, end: number): Span {
  let a = Math.max(0, Math.min(start, end));
  let b = Math.min(text.length, Math.max(start, end));
  while (a > 0 && /\S/.test(text[a - 1])) a--;
  while (b < text.length && /\S/.test(text[b])) b++;
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  return { start: a, end: b, quote: text.slice(a, b) };
}

/** Moves a span from oldText to newText. ok is false when the covered text is gone. */
export function rebaseSpan(span: Span, oldText: string, newText: string): { span: Span; ok: boolean } {
  if (oldText === newText) return { span, ok: true };

  let p = 0;
  const max = Math.min(oldText.length, newText.length);
  while (p < max && oldText[p] === newText[p]) p++;
  let s = 0;
  while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++;
  const oldEditEnd = oldText.length - s;
  const delta = newText.length - oldText.length;

  if (span.end <= p) return { span, ok: true };
  if (span.start >= oldEditEnd) {
    const start = span.start + delta;
    return { span: { start, end: span.end + delta, quote: newText.slice(start, span.end + delta) }, ok: true };
  }

  // The edit touched the span. Find the quote again, nearest to where it was.
  const hits: number[] = [];
  for (let i = newText.indexOf(span.quote); i >= 0 && span.quote; i = newText.indexOf(span.quote, i + 1)) hits.push(i);
  if (hits.length) {
    const start = hits.reduce((best, i) => (Math.abs(i - span.start) < Math.abs(best - span.start) ? i : best));
    return { span: { start, end: start + span.quote.length, quote: span.quote }, ok: true };
  }

  // Typo fix inside the span: keep its edges, stretched over the edit.
  const start = Math.min(span.start, newText.length);
  const end = Math.max(start, Math.min(span.end + delta, newText.length));
  const moved = snapToWords(newText, start, end);
  return { span: moved, ok: moved.quote.length > 0 && similar(span.quote, moved.quote) };
}

function similar(a: string, b: string): boolean {
  const longest = Math.max(a.length, b.length);
  return longest === 0 || editDistance(a.toLowerCase(), b.toLowerCase()) / longest <= 0.34;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

function mapSpans(
  doc: LyricsDoc,
  lineId: Id,
  move: (span: Span) => { span: Span; ok: boolean; line?: Id },
): Pick<LyricsDoc, 'assignments' | 'notes'> {
  const assignments = doc.assignments.map((a): Assignment => {
    if (!a.span || a.from !== lineId) return a;
    const r = move(a.span);
    const line = r.line ?? a.from;
    return { ...a, from: line, to: line, span: r.span, needsCheck: a.needsCheck || !r.ok };
  });
  const notes = doc.notes.map((n): Note => {
    if (n.anchor.kind !== 'span' || n.anchor.line !== lineId) return n;
    const r = move(n.anchor.span);
    return { ...n, anchor: { kind: 'span', line: r.line ?? lineId, span: r.span } };
  });
  return { assignments, notes };
}

function replaceLines(doc: LyricsDoc, section: number, lines: Line[]): LyricsDoc['sections'] {
  return doc.sections.map((s, i) => (i === section ? { ...s, lines } : s));
}

/** Changes one line's text and rebases everything anchored inside it. */
export function editLine(doc: LyricsDoc, lineId: Id, text: string): LyricsDoc {
  const at = locate(doc, lineId);
  if (!at || at.line.text === text) return doc;
  const old = at.line.text;
  const lines = doc.sections[at.section].lines.map((l) => (l.id === lineId ? { ...l, text } : l));
  return {
    ...doc,
    sections: replaceLines(doc, at.section, lines),
    ...mapSpans(doc, lineId, (span) => rebaseSpan(span, old, text)),
    ink: doc.ink.map((k) => (k.line === lineId ? { ...k, needsCheck: true } : k)),
  };
}

/** Splits a line at a character offset. The first half keeps the id; the second gets a new one. */
export function splitLine(doc: LyricsDoc, lineId: Id, at: number): { doc: LyricsDoc; newLine: Id } {
  const found = locate(doc, lineId);
  if (!found) return { doc, newLine: lineId };
  const head = found.line.text.slice(0, at).trimEnd();
  const tailRaw = found.line.text.slice(at);
  const tail = tailRaw.trimStart();
  const cut = at + (tailRaw.length - tail.length);
  const second: Line = { id: newId(), text: tail, added: found.line.added };

  const lines = [...doc.sections[found.section].lines];
  lines.splice(found.index, 1, { ...found.line, text: head }, second);

  const moved = mapSpans(doc, lineId, (span) => {
    if (span.end <= head.length) return { span, ok: true };
    if (span.start >= cut) {
      const start = span.start - cut;
      return { span: { ...span, start, end: span.end - cut }, ok: true, line: second.id };
    }
    const clipped = snapToWords(head, span.start, head.length);
    return { span: clipped, ok: false };
  });

  // Whole-line ranges that ended on the split line now end on its second half.
  const assignments = moved.assignments.map((a) => (!a.span && a.to === lineId ? { ...a, to: second.id } : a));
  return { doc: { ...doc, sections: replaceLines(doc, found.section, lines), assignments, notes: moved.notes }, newLine: second.id };
}

/** Joins a line with the next one in the same section. The first line's id survives. */
export function mergeWithNext(doc: LyricsDoc, lineId: Id): LyricsDoc {
  const found = locate(doc, lineId);
  if (!found) return doc;
  const lines = [...doc.sections[found.section].lines];
  const next = lines[found.index + 1];
  if (!next) return doc;
  const offset = found.line.text.length + 1;
  const text = `${found.line.text} ${next.text}`;
  lines.splice(found.index, 2, { ...found.line, text });

  const shifted = mapSpans(doc, next.id, (span) => ({ span: { ...span, start: span.start + offset, end: span.end + offset }, ok: true, line: lineId }));
  const assignments = shifted.assignments.map((a) => {
    if (a.span) return a;
    if (a.from === next.id && a.to === next.id) {
      // The whole of the absorbed line becomes a span on the merged one.
      return { ...a, from: lineId, to: lineId, span: { start: offset, end: text.length, quote: next.text } };
    }
    return { ...a, from: a.from === next.id ? lineId : a.from, to: a.to === next.id ? lineId : a.to };
  });
  const notes = shifted.notes.map((n) =>
    (n.anchor.kind === 'line' || n.anchor.kind === 'after') && n.anchor.line === next.id ? { ...n, anchor: { ...n.anchor, line: lineId } } : n,
  );
  const ink = doc.ink.map((k) => (k.line === next.id ? { ...k, line: lineId, needsCheck: true } : k));
  return { ...doc, sections: replaceLines(doc, found.section, lines), assignments, notes, ink };
}

/** Removes a line. Ranges shrink around it; anything that pointed only at it is flagged. */
export function deleteLine(doc: LyricsDoc, lineId: Id): LyricsDoc {
  const found = locate(doc, lineId);
  if (!found) return doc;
  const order = lineOrder(doc);
  const i = order.indexOf(lineId);
  const prev = order[i - 1];
  const next = order[i + 1];
  const fallback = prev ?? next;

  const assignments = doc.assignments.flatMap((a): Assignment[] => {
    const single = a.from === lineId && a.to === lineId;
    if (single) return fallback ? [{ ...a, from: fallback, to: fallback, span: undefined, needsCheck: true }] : [];
    return [{ ...a, from: a.from === lineId ? next : a.from, to: a.to === lineId ? prev : a.to }];
  });
  const notes = doc.notes.map((n): Note => {
    const a = n.anchor;
    if (a.kind === 'section' || a.line !== lineId || !fallback) return n;
    return { ...n, anchor: { kind: 'after', line: fallback } };
  });
  const ink = doc.ink.flatMap((k) => (k.line !== lineId ? [k] : fallback ? [{ ...k, line: fallback, needsCheck: true }] : []));
  const lines = doc.sections[found.section].lines.filter((l) => l.id !== lineId);
  return { ...doc, sections: replaceLines(doc, found.section, lines), assignments, notes, ink };
}

/** Everything a person sings: their own assignments plus those of groups they belong to. */
export function linesFor(doc: LyricsDoc, person: Id, groupsOf: (person: Id) => Id[]): Set<Id> {
  const mine = new Set(groupsOf(person));
  const order = lineOrder(doc);
  const out = new Set<Id>();
  for (const a of doc.assignments) {
    if (!a.people.includes(person) && !a.groups.some((g) => mine.has(g))) continue;
    const from = order.indexOf(a.from);
    const to = order.indexOf(a.to);
    for (let i = from; i >= 0 && i <= to; i++) out.add(order[i]);
  }
  return out;
}
