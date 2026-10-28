import { describe, expect, it } from 'vitest';
import { deleteLine, editLine, linesFor, mergeWithNext, rebaseSpan, snapToWords, splitLine } from './anchoring';
import { lyricsFromPaste } from './paste';
import type { Assignment, LyricsDoc } from './types';

// Fixtures follow the real sheets: "Dream on" alternates singers inside one line, and
// "Don't stop me now" gives the parenthetical to a different person.

function sheet(raw: string) {
  const doc = lyricsFromPaste(raw);
  const ids = doc.sections.flatMap((s) => s.lines.map((l) => l.id));
  return { doc, ids };
}

function assign(doc: LyricsDoc, a: Omit<Assignment, 'id' | 'people' | 'groups' | 'role'> & Partial<Assignment>): LyricsDoc {
  return { ...doc, assignments: [...doc.assignments, { id: `a${doc.assignments.length}`, role: 'lead', people: [], groups: [], ...a }] };
}

const textOf = (doc: LyricsDoc, i: number) => doc.sections.flatMap((s) => s.lines)[i].text;

describe('lyricsFromPaste', () => {
  it('splits sections on blank lines and turns tags into labels', () => {
    const { doc } = sheet('[Verse 1]\nEvery time  that I look\n\n(Coro)\nDream on\nDream on\n');
    expect(doc.sections.map((s) => s.label)).toEqual(['Verse 1', 'Coro']);
    expect(doc.sections[0].lines[0].text).toBe('Every time that I look');
    expect(doc.sections[1].lines).toHaveLength(2);
  });
});

describe('snapToWords', () => {
  it('expands a sloppy tablet selection to whole words', () => {
    const t = "Don't stop me now ('cause I'm havin' a good time)";
    expect(snapToWords(t, 20, 30).quote).toBe("('cause I'm havin'");
  });
});

describe('rebaseSpan', () => {
  const old = 'Dream on, dream on, dream on';
  const second = { start: 10, end: 18, quote: 'dream on' };

  it('leaves spans before the edit alone', () => {
    expect(rebaseSpan({ start: 0, end: 8, quote: 'Dream on' }, old, old + '!').span.start).toBe(0);
  });

  it('shifts spans after the edit', () => {
    const r = rebaseSpan(second, old, 'Oh, ' + old);
    expect(r).toEqual({ span: { start: 14, end: 22, quote: 'dream on' }, ok: true });
  });

  it('survives a typo fix inside the span', () => {
    const r = rebaseSpan({ start: 0, end: 7, quote: 'Tonigt,' }, "Tonigt, I'm gonna", "Tonight, I'm gonna");
    expect(r.ok).toBe(true);
    expect(r.span.quote).toBe('Tonight,');
  });

  it('flags a span whose words were replaced', () => {
    const r = rebaseSpan({ start: 18, end: 49, quote: "('cause I'm havin' a good time)" }, "Don't stop me now ('cause I'm havin' a good time)", "Don't stop me now, yes");
    expect(r.ok).toBe(false);
  });
});

describe('editLine', () => {
  it('keeps the line id and moves word-level assignments', () => {
    const { doc: base, ids } = sheet('Dream on, dream on, dream on');
    let doc = base;
    doc = assign(doc, { from: ids[0], to: ids[0], span: { start: 10, end: 18, quote: 'dream on' }, people: ['dani'] });
    doc = editLine(doc, ids[0], 'Dream on, oh dream on, dream on');
    expect(doc.sections[0].lines[0].id).toBe(ids[0]);
    expect(doc.assignments[0].span).toEqual({ start: 13, end: 21, quote: 'dream on' });
    expect(doc.assignments[0].needsCheck).toBeFalsy();
  });

  it('flags ink on an edited line', () => {
    const { doc: base, ids } = sheet('So don\'t stop me now');
    let doc = base;
    doc = { ...doc, ink: [{ id: 'k', line: ids[0], points: [[0.1, 0.5, 0.5]], width: 2, color: '#000' }] };
    doc = editLine(doc, ids[0], "So don't stop me now!");
    expect(doc.ink[0].needsCheck).toBe(true);
  });
});

describe('splitLine and mergeWithNext', () => {
  it('moves a parenthetical assignment onto the new second line', () => {
    const { doc: base, ids } = sheet("Don't stop me now ('cause I'm havin' a good time)");
    let doc = base;
    doc = assign(doc, { from: ids[0], to: ids[0], span: { start: 18, end: 49, quote: "('cause I'm havin' a good time)" }, people: ['jona'] });
    const r = splitLine(doc, ids[0], 18);
    expect(textOf(r.doc, 0)).toBe("Don't stop me now");
    expect(textOf(r.doc, 1)).toBe("('cause I'm havin' a good time)");
    expect(r.doc.assignments[0]).toMatchObject({ from: r.newLine, span: { start: 0, end: 31 } });
  });

  it('turns a whole-line assignment on the absorbed line into a span', () => {
    const { doc: base, ids } = sheet('Like an atom bomb about to\nOh, oh, oh, explode');
    let doc = base;
    doc = assign(doc, { from: ids[1], to: ids[1], people: ['valen'] });
    doc = mergeWithNext(doc, ids[0]);
    expect(textOf(doc, 0)).toBe('Like an atom bomb about to Oh, oh, oh, explode');
    expect(doc.assignments[0]).toMatchObject({ from: ids[0], span: { quote: 'Oh, oh, oh, explode', start: 27 } });
  });

  it('round-trips split then merge', () => {
    const { doc, ids } = sheet('I am a satellite, I am out of control');
    const r = splitLine(doc, ids[0], 17);
    const back = mergeWithNext(r.doc, ids[0]);
    expect(textOf(back, 0)).toBe('I am a satellite, I am out of control');
  });
});

describe('deleteLine', () => {
  it('shrinks ranges and flags single-line assignments instead of dropping them', () => {
    const { doc: base, ids } = sheet('one\ntwo\nthree');
    let doc = base;
    doc = assign(doc, { from: ids[0], to: ids[2], role: 'everyone' });
    doc = assign(doc, { from: ids[1], to: ids[1], people: ['mar'] });
    doc = deleteLine(doc, ids[1]);
    expect(doc.assignments[0]).toMatchObject({ from: ids[0], to: ids[2] });
    expect(doc.assignments[1]).toMatchObject({ from: ids[0], needsCheck: true });
  });
});

describe('linesFor', () => {
  it('includes lines sung through a group, like a harmony bracket over Todxs lines', () => {
    const { doc: base, ids } = sheet('Sing with me\nSing for the year\nDream on');
    let doc = base;
    doc = assign(doc, { from: ids[0], to: ids[1], role: 'everyone', groups: ['todxs'] });
    doc = assign(doc, { from: ids[0], to: ids[1], role: 'harmony', people: ['vico'] });
    doc = assign(doc, { from: ids[2], to: ids[2], people: ['dani'] });
    const vico = linesFor(doc, 'vico', () => ['todxs']);
    expect([...vico]).toEqual([ids[0], ids[1]]);
  });
});
