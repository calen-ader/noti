import { supabaseConfigured } from '../supabase/client';
import { supabaseServer } from '../supabase/server';
import type { Group, Person, Show, Song } from './types';

export type Published = { show: Show; revision: number; publishedAt: string; note?: string | null; only?: string };

export async function publishedShow(token: string): Promise<Published | null> {
  if (!supabaseConfigured) return null;
  const { data } = await (await supabaseServer()).rpc('published_show', { p_token: token });
  if (!data) return null;
  const { revision, published_at, note, ...show } = data as Show & { revision: number; published_at: string; note: string | null };
  return { show, revision, publishedAt: published_at, note };
}

export async function publishedSong(token: string): Promise<Published | null> {
  if (!supabaseConfigured) return null;
  const { data } = await (await supabaseServer()).rpc('published_song', { p_token: token });
  if (!data?.song) return null;
  const d = data as { show: { id: string; title: string }; people: Person[]; groups: Group[]; song: Song; revision: number; published_at: string };
  return {
    show: { id: d.show.id, title: d.show.title, people: d.people, groups: d.groups, songs: [d.song] },
    revision: d.revision,
    publishedAt: d.published_at,
    only: d.song.id,
  };
}
