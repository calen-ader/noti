-- Noti: initial schema.
--
-- Shape: a studio (teacher workspace) owns songs and shows. A show is the shareable unit
-- (setlist + roster + groups). Each song has sheets (Euge's lyrics sheet, Guille's chord
-- chart) stored as one JSON document per sheet, edited with optimistic concurrency.
-- Students never touch these tables: they read immutable published revisions through
-- security-definer functions, keyed by a show link token or a song link token.

create extension if not exists pgcrypto;

-- Teachers -------------------------------------------------------------------

create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table studio_members (
  studio_id uuid not null references studios on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'teacher' check (role in ('owner', 'teacher')),
  primary key (studio_id, user_id)
);

create function is_member(s uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from studio_members where studio_id = s and user_id = auth.uid())
$$;

-- Songs and sheets -----------------------------------------------------------

create table songs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios on delete cascade,
  title text not null,
  artist text,
  song_key text,
  created_at timestamptz not null default now()
);

-- doc is a LyricsDoc or ChordDoc (see src/lib/sheet/types.ts). version increments on every
-- save; a save that names a stale version is rejected so two tabs can't clobber each other.
create table sheets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs on delete cascade,
  kind text not null check (kind in ('lyrics', 'chords')),
  doc jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  unique (song_id, kind)
);

create function save_sheet(p_sheet uuid, p_doc jsonb, p_version int) returns int
  language plpgsql security invoker as $$
declare next_version int;
begin
  update sheets set doc = p_doc, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where id = p_sheet and version = p_version
  returning version into next_version;
  if next_version is null then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;
  return next_version;
end $$;

-- Shows ----------------------------------------------------------------------

create table shows (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios on delete cascade,
  title text not null,
  show_date date,
  -- the whole-show link; song links live on show_songs
  link_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

create table show_songs (
  show_id uuid not null references shows on delete cascade,
  song_id uuid not null references songs on delete cascade,
  position text not null, -- fractional index, so reordering never renumbers
  link_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  primary key (show_id, song_id)
);

-- First names only. No email, no account: students are often minors.
create table people (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows on delete cascade,
  display_name text not null,
  position text not null
);

-- Mic groups, voice parts, "Todxs". Colour is a default; songs auto-contrast on top of it.
create table groups (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows on delete cascade,
  kind text not null check (kind in ('mic', 'part', 'everyone', 'custom')),
  label text not null,
  color text,
  members uuid[] not null default '{}'
);

-- Published revisions: immutable snapshot of the whole show (songs, sheets, roster).
-- "What changed for you" is a diff between two of these.
create table revisions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows on delete cascade,
  n int not null,
  snapshot jsonb not null,
  note text,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users,
  unique (show_id, n)
);

-- Audio on notes. Bytes live in the private "audio" storage bucket; reads use signed URLs.
create table audio_clips (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios on delete cascade,
  storage_key text not null unique,
  mime text not null,
  duration_ms int not null check (duration_ms <= 180000),
  bytes int not null check (bytes <= 8000000),
  created_at timestamptz not null default now()
);

-- Row-level security: teachers see their studio, nobody else sees anything directly. ------

alter table studios enable row level security;
alter table studio_members enable row level security;
alter table songs enable row level security;
alter table sheets enable row level security;
alter table shows enable row level security;
alter table show_songs enable row level security;
alter table people enable row level security;
alter table groups enable row level security;
alter table revisions enable row level security;
alter table audio_clips enable row level security;

create policy member_read on studios for select using (is_member(id));
create policy member_update on studios for update using (is_member(id));
create policy own_rows on studio_members for select using (user_id = auth.uid());

create policy member_all on songs for all using (is_member(studio_id)) with check (is_member(studio_id));
create policy member_all on shows for all using (is_member(studio_id)) with check (is_member(studio_id));
create policy member_all on audio_clips for all using (is_member(studio_id)) with check (is_member(studio_id));

create policy member_all on sheets for all
  using (is_member((select studio_id from songs where songs.id = song_id)))
  with check (is_member((select studio_id from songs where songs.id = song_id)));

create policy member_all on show_songs for all
  using (is_member((select studio_id from shows where shows.id = show_id)))
  with check (is_member((select studio_id from shows where shows.id = show_id)));
create policy member_all on people for all
  using (is_member((select studio_id from shows where shows.id = show_id)))
  with check (is_member((select studio_id from shows where shows.id = show_id)));
create policy member_all on groups for all
  using (is_member((select studio_id from shows where shows.id = show_id)))
  with check (is_member((select studio_id from shows where shows.id = show_id)));
create policy member_all on revisions for all
  using (is_member((select studio_id from shows where shows.id = show_id)))
  with check (is_member((select studio_id from shows where shows.id = show_id)));

-- A teacher's first sign-in creates their studio.
create function create_studio(p_name text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into studios (name) values (p_name) returning id into s;
  insert into studio_members (studio_id, user_id, role) values (s, auth.uid(), 'owner');
  return s;
end $$;

-- Student access ---------------------------------------------------------------
-- The only door for anonymous readers. Returns the latest published snapshot, nothing else.

create function published_show(p_token text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select r.snapshot || jsonb_build_object('revision', r.n, 'published_at', r.published_at, 'note', r.note)
    from shows s join revisions r on r.show_id = s.id
   where s.link_token = p_token
   order by r.n desc limit 1
$$;

create function published_song(p_token text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'show', jsonb_build_object('title', r.snapshot->>'title'),
           'people', r.snapshot->'people',
           'groups', r.snapshot->'groups',
           'song', (select x from jsonb_array_elements(r.snapshot->'songs') x where x->>'id' = ss.song_id::text),
           'revision', r.n, 'published_at', r.published_at)
    from show_songs ss join shows s on s.id = ss.show_id
    join revisions r on r.show_id = s.id
   where ss.link_token = p_token
   order by r.n desc limit 1
$$;

revoke all on function published_show(text) from public;
revoke all on function published_song(text) from public;
grant execute on function published_show(text) to anon, authenticated;
grant execute on function published_song(text) to anon, authenticated;
grant execute on function create_studio(text) to authenticated;
grant execute on function save_sheet(uuid, jsonb, int) to authenticated;

insert into storage.buckets (id, name, public) values ('audio', 'audio', false)
  on conflict (id) do nothing;
