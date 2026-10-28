import type { Id, LyricsDoc } from '../sheet/types';

// What a teacher works on in one sitting: a show with its roster, groups and songs.
// The same shape is stored locally for the demo and published as a revision snapshot.

export type Person = { id: Id; name: string };

export type Group = {
  id: Id;
  kind: 'mic' | 'part' | 'everyone' | 'custom';
  label: string;
  members: Id[];
};

export type Song = { id: Id; title: string; artist?: string; lyrics: LyricsDoc };

export type Show = {
  id: Id;
  title: string;
  date?: string;
  people: Person[];
  groups: Group[];
  songs: Song[];
};
