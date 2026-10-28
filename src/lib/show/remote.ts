import type { SupabaseClient } from '@supabase/supabase-js';
import type { Id, LyricsDoc } from '../sheet/types';
import type { Group, Show, Song } from './types';

// Loads a show into the editor's shape and writes the editor's changes back, table by table.
// Sheets save with their version number, so a stale tab gets an error instead of overwriting.

export type Links = { show: string; songs: Record<Id, string> };
export type Remote = { sheetIds: Record<Id, Id>; versions: Record<Id, number>; links: Links };

const pos = (i: number) => String(i).padStart(4, '0');

export async function myStudio(sb: SupabaseClient): Promise<Id> {
  const { data } = await sb.from('studio_members').select('studio_id').limit(1).maybeSingle();
  if (data) return data.studio_id as Id;
  const { data: created, error } = await sb.rpc('create_studio', { p_name: 'Mi estudio' });
  if (error) throw error;
  return created as Id;
}

export async function listShows(sb: SupabaseClient) {
  const { data, error } = await sb.from('shows').select('id, title, show_date, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createShow(sb: SupabaseClient, title: string): Promise<Id> {
  const studio = await myStudio(sb);
  const { data, error } = await sb.from('shows').insert({ studio_id: studio, title }).select('id').single();
  if (error) throw error;
  await sb.from('groups').insert({ show_id: data.id, kind: 'everyone', label: 'Todxs', members: [] });
  return data.id as Id;
}

export async function loadShow(sb: SupabaseClient, id: Id): Promise<{ show: Show; remote: Remote; studio: Id }> {
  const [{ data: s, error }, { data: people }, { data: groups }, { data: items }] = await Promise.all([
    sb.from('shows').select('id, studio_id, title, show_date, link_token').eq('id', id).single(),
    sb.from('people').select('id, display_name, position').eq('show_id', id).order('position'),
    sb.from('groups').select('id, kind, label, members').eq('show_id', id),
    sb.from('show_songs').select('song_id, position, link_token, songs(id, title, artist, sheets(id, kind, doc, version))').eq('show_id', id).order('position'),
  ]);
  if (error) throw error;

  const remote: Remote = { sheetIds: {}, versions: {}, links: { show: s.link_token, songs: {} } };
  type Row = { song_id: Id; link_token: string; songs: { id: Id; title: string; artist: string | null; sheets: { id: Id; kind: string; doc: LyricsDoc; version: number }[] } };
  const songs: Song[] = ((items ?? []) as unknown as Row[]).map((r) => {
    const sheet = r.songs.sheets.find((x) => x.kind === 'lyrics')!;
    remote.sheetIds[r.song_id] = sheet.id;
    remote.versions[r.song_id] = sheet.version;
    remote.links.songs[r.song_id] = r.link_token;
    return { id: r.songs.id, title: r.songs.title, artist: r.songs.artist ?? undefined, lyrics: sheet.doc };
  });

  return {
    studio: s.studio_id,
    remote,
    show: {
      id: s.id,
      title: s.title,
      date: s.show_date ?? undefined,
      people: (people ?? []).map((p) => ({ id: p.id, name: p.display_name })),
      groups: (groups ?? []) as Group[],
      songs,
    },
  };
}

/** Writes whatever differs between prev and next. Returns the updated remote bookkeeping. */
export async function syncShow(sb: SupabaseClient, studio: Id, prev: Show, next: Show, remote: Remote): Promise<Remote> {
  const r: Remote = { sheetIds: { ...remote.sheetIds }, versions: { ...remote.versions }, links: { ...remote.links, songs: { ...remote.links.songs } } };
  const check = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };

  if (prev.title !== next.title) check((await sb.from('shows').update({ title: next.title }).eq('id', next.id)).error);

  // People
  const prevPeople = new Map(prev.people.map((p, i) => [p.id, `${p.name}|${i}`]));
  const upPeople = next.people.filter((p, i) => prevPeople.get(p.id) !== `${p.name}|${i}`)
    .map((p) => ({ id: p.id, show_id: next.id, display_name: p.name, position: pos(next.people.indexOf(p)) }));
  if (upPeople.length) check((await sb.from('people').upsert(upPeople)).error);
  const goneP = prev.people.filter((p) => !next.people.some((x) => x.id === p.id)).map((p) => p.id);
  if (goneP.length) check((await sb.from('people').delete().in('id', goneP)).error);

  // Groups
  const prevGroups = new Map(prev.groups.map((g) => [g.id, JSON.stringify(g)]));
  const upGroups = next.groups.filter((g) => prevGroups.get(g.id) !== JSON.stringify(g))
    .map((g) => ({ id: g.id, show_id: next.id, kind: g.kind, label: g.label, members: g.members }));
  if (upGroups.length) check((await sb.from('groups').upsert(upGroups)).error);
  const goneG = prev.groups.filter((g) => !next.groups.some((x) => x.id === g.id)).map((g) => g.id);
  if (goneG.length) check((await sb.from('groups').delete().in('id', goneG)).error);

  // Songs: new ones get a song row, a sheet and a place in the setlist.
  for (const song of next.songs) {
    if (r.sheetIds[song.id]) continue;
    check((await sb.from('songs').insert({ id: song.id, studio_id: studio, title: song.title, artist: song.artist ?? null })).error);
    const { data: sheet, error } = await sb.from('sheets').insert({ song_id: song.id, kind: 'lyrics', doc: song.lyrics }).select('id, version').single();
    check(error);
    r.sheetIds[song.id] = sheet!.id;
    r.versions[song.id] = sheet!.version;
    const { data: item, error: e2 } = await sb.from('show_songs')
      .insert({ show_id: next.id, song_id: song.id, position: pos(next.songs.indexOf(song)) }).select('link_token').single();
    check(e2);
    r.links.songs[song.id] = item!.link_token;
  }
  const gone = prev.songs.filter((s) => !next.songs.some((x) => x.id === s.id));
  for (const s of gone) check((await sb.from('show_songs').delete().eq('show_id', next.id).eq('song_id', s.id)).error);

  const order = (s: Show) => s.songs.map((x) => x.id).join();
  if (order(prev) !== order(next)) {
    for (const [i, s] of next.songs.entries()) {
      check((await sb.from('show_songs').update({ position: pos(i) }).eq('show_id', next.id).eq('song_id', s.id)).error);
    }
  }

  // Sheets
  for (const song of next.songs) {
    const before = prev.songs.find((s) => s.id === song.id);
    if (!before || before.lyrics === song.lyrics) continue;
    const { data, error } = await sb.rpc('save_sheet', { p_sheet: r.sheetIds[song.id], p_doc: song.lyrics, p_version: r.versions[song.id] });
    if (error) throw new Error(error.message.includes('stale_version') ? 'stale' : error.message);
    r.versions[song.id] = data as number;
  }
  return r;
}

export async function publish(sb: SupabaseClient, show: Show, note: string): Promise<number> {
  const { data: last } = await sb.from('revisions').select('n').eq('show_id', show.id).order('n', { ascending: false }).limit(1).maybeSingle();
  const n = (last?.n ?? 0) + 1;
  const { error } = await sb.from('revisions').insert({ show_id: show.id, n, snapshot: show, note: note || null });
  if (error) throw error;
  return n;
}
