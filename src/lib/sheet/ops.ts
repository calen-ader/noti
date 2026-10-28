import { lineOrder, locate } from './anchoring';
import { colorOf, songColors, type Highlighter } from './colors';
import { newId } from './ids';
import type { Assignment, Id, LyricsDoc, Role, Span } from './types';

// Editing operations Euge performs on a sheet, and the derived layout the sheet view draws.

export type Who = { people: Id[]; groups: Id[] };

/** Overlay roles draw as a bracket in the margin instead of a highlight, so they can sit on top of "everyone". */
export const OVERLAY_ROLES: Role[] = ['harmony'];

function sameWho(a: Assignment, who: Who) {
  const eq = (x: Id[], y: Id[]) => x.length === y.length && x.every((v) => y.includes(v));
  return eq(a.people, who.people) && eq(a.groups, who.groups);
}

function sameTarget(a: Assignment, from: Id, to: Id, span?: Span) {
  if (a.from !== from || a.to !== to) return false;
  if (!a.span || !span) return !a.span && !span;
  return a.span.start === span.start && a.span.end === span.end;
}

/**
 * Assigns a run of lines (or part of one line) to people or groups. Doing the exact same
 * assignment again removes it, so a second tap undoes the first.
 */
export function toggleAssignment(doc: LyricsDoc, target: { from: Id; to: Id; span?: Span }, role: Role, who: Who): LyricsDoc {
  const order = lineOrder(doc);
  let { from, to } = target;
  if (order.indexOf(from) > order.indexOf(to)) [from, to] = [to, from];
  const existing = doc.assignments.find((a) => a.role === role && sameWho(a, who) && sameTarget(a, from, to, target.span));
  if (existing) return { ...doc, assignments: doc.assignments.filter((a) => a !== existing) };
  const added: Assignment = { id: newId(), from, to, span: target.span, role, people: who.people, groups: who.groups };
  return { ...doc, assignments: [...doc.assignments, added] };
}

export function removeAssignment(doc: LyricsDoc, id: Id): LyricsDoc {
  return { ...doc, assignments: doc.assignments.filter((a) => a.id !== id) };
}

/** Clears every highlight-type assignment on the target, keeping overlays like harmony. */
export function clearTarget(doc: LyricsDoc, target: { from: Id; to: Id; span?: Span }): LyricsDoc {
  const order = lineOrder(doc);
  const lo = Math.min(order.indexOf(target.from), order.indexOf(target.to));
  const hi = Math.max(order.indexOf(target.from), order.indexOf(target.to));
  return {
    ...doc,
    assignments: doc.assignments.filter((a) => {
      if (OVERLAY_ROLES.includes(a.role)) return true;
      const f = order.indexOf(a.from);
      const t = order.indexOf(a.to);
      if (t < lo || f > hi) return true;
      if (target.span && a.span) return a.span.end <= target.span.start || a.span.start >= target.span.end;
      return false;
    }),
  };
}

/** Adds a line the source lyrics don't have, like an echo "(will take you away)", after another. */
export function insertAddedLine(doc: LyricsDoc, after: Id, text: string): { doc: LyricsDoc; line: Id } {
  const at = locate(doc, after);
  if (!at) return { doc, line: after };
  const line = { id: newId(), text, added: true };
  const sections = doc.sections.map((s, i) => {
    if (i !== at.section) return s;
    const lines = [...s.lines];
    lines.splice(at.index + 1, 0, line);
    return { ...s, lines };
  });
  return { doc: { ...doc, sections }, line: line.id };
}

export function addNote(doc: LyricsDoc, after: Id, body: string): LyricsDoc {
  return { ...doc, notes: [...doc.notes, { id: newId(), anchor: { kind: 'after', line: after }, body, audio: [] }] };
}

export function renameSection(doc: LyricsDoc, section: Id, label: string): LyricsDoc {
  return { ...doc, sections: doc.sections.map((s) => (s.id === section ? { ...s, label } : s)) };
}

// ---- Layout ---------------------------------------------------------------------------

export type Segment = { start: number; end: number; text: string; fills: Highlighter[]; assignments: Id[] };

/** Splits a line into runs that share the same set of highlights. Overlapping singers stack. */
export function lineSegments(doc: LyricsDoc, lineId: Id, colors = songColors(doc)): Segment[] {
  const order = lineOrder(doc);
  const at = locate(doc, lineId);
  if (!at) return [];
  const text = at.line.text;
  const i = order.indexOf(lineId);
  const covering = doc.assignments.filter((a) => {
    if (OVERLAY_ROLES.includes(a.role)) return false;
    return order.indexOf(a.from) <= i && i <= order.indexOf(a.to) && (!a.span || a.from === lineId);
  });

  const cuts = new Set([0, text.length]);
  for (const a of covering) if (a.span) cuts.add(a.span.start).add(a.span.end);
  const points = [...cuts].filter((c) => c >= 0 && c <= text.length).sort((x, y) => x - y);

  const out: Segment[] = [];
  for (let k = 0; k < points.length - 1; k++) {
    const [start, end] = [points[k], points[k + 1]];
    const on = covering.filter((a) => !a.span || (a.span.start <= start && end <= a.span.end));
    const fills = [...new Set(on.map((a) => colorOf(colors, a)))];
    out.push({ start, end, text: text.slice(start, end), fills, assignments: on.map((a) => a.id) });
  }
  return out;
}

export type Bracket = { id: Id; from: Id; to: Id; role: Role; who: Who; color: Highlighter };

export function overlays(doc: LyricsDoc, colors = songColors(doc)): Bracket[] {
  return doc.assignments
    .filter((a) => OVERLAY_ROLES.includes(a.role))
    .map((a) => ({ id: a.id, from: a.from, to: a.to, role: a.role, who: { people: a.people, groups: a.groups }, color: colorOf(colors, a) }));
}

/** Names to write in the margin of a line: whoever starts singing there. */
export function marginLabels(doc: LyricsDoc, lineId: Id): Assignment[] {
  return doc.assignments.filter((a) => a.from === lineId && !OVERLAY_ROLES.includes(a.role));
}
