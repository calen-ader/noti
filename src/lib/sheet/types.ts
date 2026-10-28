// The documents teachers edit. One LyricsDoc per song for Euge, one ChordDoc per song for Guille.
// Line ids are minted once and never reused, so assignments, notes and ink survive text edits.

export type Id = string;

export type Role = 'lead' | 'harmony' | 'coro' | 'everyone' | 'solo' | 'echo';

/** Characters [start, end) of one line, plus the text they covered, for re-anchoring. */
export type Span = { start: number; end: number; quote: string };

export type Line = {
  id: Id;
  text: string;
  /** Not in the source lyrics: an echo or ad-lib the teacher wrote in, like "(will take you away)". */
  added?: boolean;
};

export type Section = { id: Id; label: string; lines: Line[] };

/** Who sings what. Covers a run of whole lines, or part of a single line when span is set. */
export type Assignment = {
  id: Id;
  from: Id;
  to: Id;
  span?: Span;
  role: Role;
  people: Id[];
  groups: Id[];
  /** Set when an edit removed the text this pointed at; the teacher confirms or moves it. */
  needsCheck?: boolean;
};

export type NoteAnchor =
  | { kind: 'line'; line: Id }
  | { kind: 'after'; line: Id }
  | { kind: 'section'; section: Id }
  | { kind: 'span'; line: Id; span: Span };

export type Note = { id: Id; anchor: NoteAnchor; body: string; audio: Id[] };

/**
 * Pen strokes. Points are relative to the line box the stroke starts on (x as a fraction of
 * the sheet width, y in line heights), so ink moves with its line when the view filters or scales.
 */
export type Stroke = {
  id: Id;
  line: Id;
  points: [x: number, y: number, pressure: number][];
  width: number;
  color: string;
  needsCheck?: boolean;
};

export type LyricsDoc = {
  kind: 'lyrics';
  sections: Section[];
  assignments: Assignment[];
  notes: Note[];
  ink: Stroke[];
};
