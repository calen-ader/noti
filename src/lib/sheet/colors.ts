import { lineOrder } from './anchoring';
import type { Assignment, LyricsDoc } from './types';

// Colour is contrast within one song, not identity: yellow always means everyone, and
// everybody else gets a highlighter that differs from whoever sings next to them.

export const EVERYONE = 'yellow';
export const HIGHLIGHTERS = ['green', 'pink', 'cyan', 'orange', 'violet', 'red', 'blue', 'lime'] as const;
export type Highlighter = (typeof HIGHLIGHTERS)[number] | typeof EVERYONE;

/** The person or group an assignment's colour belongs to. Several people share a key. */
export function singerKey(a: Assignment): string {
  if (a.role === 'everyone') return 'everyone';
  return [...a.groups.map((g) => `g:${g}`), ...a.people.map((p) => `p:${p}`)].sort().join('+');
}

export function songColors(doc: LyricsDoc): Map<string, Highlighter> {
  const order = lineOrder(doc);
  const index = new Map(order.map((id, i) => [id, i]));

  // Where each singer first appears and which lines they cover.
  const singers: { key: string; first: number; lines: Set<number> }[] = [];
  const byKey = new Map<string, (typeof singers)[number]>();
  for (const a of doc.assignments) {
    const key = singerKey(a);
    if (key === 'everyone' || !key) continue;
    let s = byKey.get(key);
    if (!s) {
      s = { key, first: Infinity, lines: new Set() };
      byKey.set(key, s);
      singers.push(s);
    }
    const from = index.get(a.from) ?? 0;
    const to = index.get(a.to) ?? from;
    s.first = Math.min(s.first, from);
    for (let i = from; i <= to; i++) s.lines.add(i);
  }
  singers.sort((a, b) => a.first - b.first);

  // Two singers are neighbours if they share a line or sit on adjacent lines.
  const near = (a: Set<number>, b: Set<number>) => [...a].some((i) => b.has(i) || b.has(i - 1) || b.has(i + 1));

  const colors = new Map<string, Highlighter>([['everyone', EVERYONE]]);
  const used = new Map<Highlighter, number>();
  for (const s of singers) {
    const blocked = new Set(singers.filter((o) => colors.has(o.key) && near(o.lines, s.lines)).map((o) => colors.get(o.key)));
    const free = HIGHLIGHTERS.filter((c) => !blocked.has(c));
    const pool = free.length ? free : [...HIGHLIGHTERS];
    // Least-used free colour keeps the page balanced instead of all green.
    const pick = pool.reduce((best, c) => ((used.get(c) ?? 0) < (used.get(best) ?? 0) ? c : best));
    colors.set(s.key, pick);
    used.set(pick, (used.get(pick) ?? 0) + 1);
  }
  return colors;
}

export function colorOf(colors: Map<string, Highlighter>, a: Assignment): Highlighter {
  return colors.get(singerKey(a)) ?? EVERYONE;
}

