-- Noti 0002: the studio (v7). Run once in the Supabase SQL editor, after 0001.
--
-- A project is one row: its settings, cast, colours and dates as one document, plus what was last published for
-- the student link. Each song is its own row, so two people can work on different songs at the same time. Every
-- save sends the version it started from; if someone else saved first, nothing is overwritten and the app says so.
-- Nothing is ever really deleted: a deleted project or song only gets deleted_at.

create extension if not exists pgcrypto;

create table public.projects (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  doc jsonb not null default '{}'::jsonb,
  published jsonb,
  version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- the student link and the link to join as an editor live in the document
create index projects_link on public.projects ((doc->>'link'));
create index projects_invite on public.projects ((doc->>'invite'));

create table public.project_members (
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'edita',
  name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.project_songs (
  project_id text not null references public.projects(id) on delete cascade,
  id text not null,
  doc jsonb not null,
  version int not null default 1,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  doc jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- whoever made the project, or joined it with its link
create or replace function public.can_edit(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p and owner_id = auth.uid())
      or exists (select 1 from project_members where project_id = p and user_id = auth.uid());
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_songs enable row level security;
alter table public.profiles enable row level security;

-- reading is direct; every write goes through the functions below, which check access and the version
create policy projects_read on public.projects for select to authenticated using (public.can_edit(id));
create policy members_read on public.project_members for select to authenticated using (public.can_edit(project_id));
create policy songs_read on public.project_songs for select to authenticated using (public.can_edit(project_id));
create policy profiles_read on public.profiles for select to authenticated using (user_id = auth.uid());

-- returns the new version, or null when someone else saved first (or the id is taken)
create or replace function public.save_project(p_id text, p_doc jsonb, p_published jsonb, p_version int, p_deleted boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_version = 0 then
    insert into projects (id, owner_id, doc, published, deleted_at)
    values (p_id, auth.uid(), p_doc, p_published, case when p_deleted then now() end)
    on conflict (id) do nothing
    returning version into v;
    return v;
  end if;
  if not can_edit(p_id) then raise exception 'no access'; end if;
  update projects set doc = p_doc, published = p_published, version = version + 1, updated_at = now(),
    deleted_at = case when p_deleted then coalesce(deleted_at, now()) end
  where id = p_id and version = p_version
  returning version into v;
  return v;
end $$;

create or replace function public.save_song(p_project text, p_id text, p_doc jsonb, p_version int, p_deleted boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not can_edit(p_project) then raise exception 'no access'; end if;
  if p_version = 0 then
    insert into project_songs (project_id, id, doc, deleted_at)
    values (p_project, p_id, p_doc, case when p_deleted then now() end)
    on conflict (project_id, id) do nothing
    returning version into v;
    return v;
  end if;
  update project_songs set doc = p_doc, version = version + 1, updated_at = now(),
    deleted_at = case when p_deleted then coalesce(deleted_at, now()) end
  where project_id = p_project and id = p_id and version = p_version
  returning version into v;
  return v;
end $$;

-- your name shows on the projects you're in, so it's copied there too
create or replace function public.save_profile(p_name text, p_doc jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into profiles (user_id, name, doc) values (auth.uid(), coalesce(p_name, ''), coalesce(p_doc, '{}'::jsonb))
  on conflict (user_id) do update set name = excluded.name, doc = excluded.doc, updated_at = now();
  if coalesce(p_name, '') <> '' then
    update project_members set name = p_name where user_id = auth.uid();
  end if;
end $$;

-- the link for someone who will edit: signs them in to the project and returns its id
create or replace function public.join_project(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare pid text; nm text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into pid from projects where doc->>'invite' = p_token and deleted_at is null limit 1;
  if pid is null then return null; end if;
  select nullif(name, '') into nm from profiles where user_id = auth.uid();
  if nm is null then select initcap(split_part(email, '@', 1)) into nm from auth.users where id = auth.uid(); end if;
  if not exists (select 1 from projects where id = pid and owner_id = auth.uid()) then
    insert into project_members (project_id, user_id, name) values (pid, auth.uid(), coalesce(nm, '')) on conflict do nothing;
  end if;
  return pid;
end $$;

-- the student link: only what was published, and an event's note only when it was meant for everyone
create or replace function public.published_project(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'name', doc->'name', 'pc', doc->'pc', 'people', doc->'people', 'cast', doc->'cast', 'colors', doc->'colors',
    'published', published,
    'events', (select coalesce(jsonb_agg(case when e->>'noteAll' = 'false' then e - 'note' else e end), '[]'::jsonb)
               from jsonb_array_elements(coalesce(doc->'events', '[]'::jsonb)) e))
  from projects
  where doc->>'link' = p_token and doc->>'shared' = 'true' and published is not null and deleted_at is null
  limit 1;
$$;

revoke execute on function public.save_project(text, jsonb, jsonb, int, boolean) from public, anon;
revoke execute on function public.save_song(text, text, jsonb, int, boolean) from public, anon;
revoke execute on function public.save_profile(text, jsonb) from public, anon;
revoke execute on function public.join_project(text) from public, anon;
revoke execute on function public.can_edit(text) from public, anon;
grant execute on function public.save_project(text, jsonb, jsonb, int, boolean) to authenticated;
grant execute on function public.save_song(text, text, jsonb, int, boolean) to authenticated;
grant execute on function public.save_profile(text, jsonb) to authenticated;
grant execute on function public.join_project(text) to authenticated;
grant execute on function public.can_edit(text) to authenticated;
grant execute on function public.published_project(text) to anon, authenticated;
