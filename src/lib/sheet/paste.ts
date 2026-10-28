import { newId } from './ids';
import type { LyricsDoc, Section } from './types';

const TAG = /^\s*[[(]\s*([^\])]{1,40})\s*[\])]\s*:?\s*$/;

/**
 * Turns pasted lyrics into a sheet. Blank lines split sections; a lone "[Chorus]" or "(Coro)"
 * line becomes the next section's label instead of a lyric. Lines are trimmed, whitespace
 * collapsed, and every line gets a fresh id.
 */
export function lyricsFromPaste(raw: string): LyricsDoc {
  const sections: Section[] = [];
  let label = '';
  let current: Section | null = null;

  for (const rawLine of raw.replace(/\r\n?/g, '\n').split('\n')) {
    const text = rawLine.replace(/\s+/g, ' ').trim();
    if (!text) {
      current = null;
      continue;
    }
    const tag = TAG.exec(text);
    if (tag) {
      current = null;
      label = tag[1].trim();
      continue;
    }
    if (!current) {
      current = { id: newId(), label, lines: [] };
      sections.push(current);
      label = '';
    }
    current.lines.push({ id: newId(), text });
  }

  return { kind: 'lyrics', sections, assignments: [], notes: [], ink: [] };
}
