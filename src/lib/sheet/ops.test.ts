import { describe, expect, it } from 'vitest';
import { EVERYONE, songColors, singerKey } from './colors';
import { clearTarget, insertAddedLine, lineSegments, overlays, toggleAssignment } from './ops';
import { lyricsFromPaste } from './paste';

const sheet = (raw: string) => {
  const doc = lyricsFromPaste(raw);
  return { doc, ids: doc.sections.flatMap((s) => s.lines.map((l) => l.id)) };
};
const one = (p: string) => ({ people: [p], groups: [] });

describe('toggleAssignment', () => {
  it('a second identical tap removes the assignment', () => {
    const { doc, ids } = sheet('a\nb');
    const once = toggleAssignment(doc, { from: ids[0], to: ids[0] }, 'lead', one('mar'));
    expect(once.assignments).toHaveLength(1);
    expect(toggleAssignment(once, { from: ids[0], to: ids[0] }, 'lead', one('mar')).assignments).toHaveLength(0);
  });

  it('normalises a range dragged upwards', () => {
    const { doc, ids } = sheet('a\nb\nc');
    const d = toggleAssignment(doc, { from: ids[2], to: ids[0] }, 'lead', one('mar'));
    expect(d.assignments[0]).toMatchObject({ from: ids[0], to: ids[2] });
  });
});

describe('songColors', () => {
  it('keeps yellow for everyone and gives neighbours different colours', () => {
    const { doc: base, ids } = sheet('one\ntwo\nthree\nfour');
    let doc = toggleAssignment(base, { from: ids[0], to: ids[0] }, 'lead', one('vico'));
    doc = toggleAssignment(doc, { from: ids[1], to: ids[1] }, 'lead', one('dani'));
    doc = toggleAssignment(doc, { from: ids[2], to: ids[3] }, 'everyone', { people: [], groups: ['todxs'] });
    const c = songColors(doc);
    expect(c.get('everyone')).toBe(EVERYONE);
    expect(c.get('p:vico')).not.toBe(c.get('p:dani'));
    expect(singerKey(doc.assignments[2])).toBe('everyone');
  });
});

describe('lineSegments', () => {
  it('alternates singers inside one line, like "Dream on"', () => {
    const { doc: base, ids } = sheet('Dream on, dream on, dream on');
    let doc = toggleAssignment(base, { from: ids[0], to: ids[0], span: { start: 0, end: 9, quote: 'Dream on,' } }, 'lead', one('dani'));
    doc = toggleAssignment(doc, { from: ids[0], to: ids[0], span: { start: 10, end: 19, quote: 'dream on,' } }, 'lead', one('vico'));
    const segs = lineSegments(doc, ids[0]);
    expect(segs.map((s) => s.text)).toEqual(['Dream on,', ' ', 'dream on,', ' dream on']);
    expect(segs[0].fills).toHaveLength(1);
    expect(segs[0].fills[0]).not.toBe(segs[2].fills[0]);
    expect(segs[3].fills).toEqual([]);
  });

  it('stacks two singers on the same words and keeps harmony out of the fill', () => {
    const { doc: base, ids } = sheet('Sing with me');
    let doc = toggleAssignment(base, { from: ids[0], to: ids[0] }, 'everyone', { people: [], groups: ['todxs'] });
    doc = toggleAssignment(doc, { from: ids[0], to: ids[0] }, 'lead', one('mar'));
    doc = toggleAssignment(doc, { from: ids[0], to: ids[0] }, 'harmony', one('vico'));
    expect(lineSegments(doc, ids[0])[0].fills).toHaveLength(2);
    expect(overlays(doc)).toHaveLength(1);
  });
});

describe('clearTarget and insertAddedLine', () => {
  it('clears highlights but keeps the harmony bracket', () => {
    const { doc: base, ids } = sheet('a');
    let doc = toggleAssignment(base, { from: ids[0], to: ids[0] }, 'lead', one('mar'));
    doc = toggleAssignment(doc, { from: ids[0], to: ids[0] }, 'harmony', one('vico'));
    expect(clearTarget(doc, { from: ids[0], to: ids[0] }).assignments.map((a) => a.role)).toEqual(['harmony']);
  });

  it('adds an echo line after another, marked as not in the lyrics', () => {
    const { doc, ids } = sheet('Maybe tomorrow the good Lord will take you away\nnext');
    const r = insertAddedLine(doc, ids[0], '(will take you away)');
    expect(r.doc.sections[0].lines[1]).toMatchObject({ text: '(will take you away)', added: true });
  });
});
