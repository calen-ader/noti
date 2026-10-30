-- Noti 0003: who can do what. Run once in the Supabase SQL editor, after 0002.
--
-- Accounts are by invitation: anyone can sign in, but only someone who already has a project, or who joined one
-- with its invite link, can start a new project. In a project, the person who made it (and anyone they make
-- "organiza") decides who's in: only they can delete it, turn the student link on or off, make a new invite link,
-- or remove someone. Everyone in a project can edit songs, dates and casting as before.
-- Also: limits on how big a saved document can be and how many projects one person can make, and ids that can
-- only hold plain characters.

-- the person who made the project, or someone they made an organiser
create or replace function public.can_admin(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p and owner_id = auth.uid())
      or exists (select 1 from project_members where project_id = p and user_id = auth.uid() and role = 'organiza');
$$;

-- invited: has a project of their own (made before invitations, or since) or is in someone else's
create or replace function public.can_create() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where owner_id = auth.uid())
      or exists (select 1 from project_members where user_id = auth.uid());
$$;

-- sizes and ids: new rows and changes are checked; rows already there are left as they are (not valid)
alter table public.projects add constraint projects_id_plain check (id ~ '^[A-Za-z0-9_-]{1,64}$') not valid;
alter table public.projects add constraint projects_doc_size check (octet_length(doc::text) < 1000000) not valid;
alter table public.projects add constraint projects_published_size check (published is null or octet_length(published::text) < 2000000) not valid;
alter table public.project_songs add constraint songs_id_plain check (id ~ '^[A-Za-z0-9_-]{1,64}$') not valid;
alter table public.project_songs add constraint songs_doc_size check (octet_length(doc::text) < 300000) not valid;
alter table public.profiles add constraint profiles_doc_size check (octet_length(doc::text) < 200000 and length(name) <= 80) not valid;
alter table public.project_members add constraint members_role check (role in ('edita', 'organiza')) not valid;

-- same as 0002, plus: new projects only for invited people (at most 50 each), and for someone who isn't an
-- organiser the invite, student link, sharing and owner name stay as they were, and deleting does nothing
create or replace function public.save_project(p_id text, p_doc jsonb, p_published jsonb, p_version int, p_deleted boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare v int; old jsonb; was timestamptz; k text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_version = 0 then
    if not can_create() then raise exception 'invite only'; end if; -- not in any project yet: join one with its link first
    if (select count(*) from projects where owner_id = auth.uid() and deleted_at is null) >= 50 then raise exception 'too many projects'; end if;
    insert into projects (id, owner_id, doc, published, deleted_at)
    values (p_id, auth.uid(), p_doc, p_published, case when p_deleted then now() end)
    on conflict (id) do nothing
    returning version into v;
    return v;
  end if;
  if not can_edit(p_id) then raise exception 'no access'; end if;
  if not can_admin(p_id) then
    select doc, deleted_at into old, was from projects where id = p_id;
    foreach k in array array['invite', 'link', 'shared', 'owner'] loop
      p_doc := case when old ? k then jsonb_set(p_doc, array[k], old -> k) else p_doc - k end;
    end loop;
    update projects set doc = p_doc, published = p_published, version = version + 1, updated_at = now()
    where id = p_id and version = p_version
    returning version into v;
    return v;
  end if;
  update projects set doc = p_doc, published = p_published, version = version + 1, updated_at = now(),
    deleted_at = case when p_deleted then coalesce(deleted_at, now()) end
  where id = p_id and version = p_version
  returning version into v;
  return v;
end $$;

-- an organiser takes someone out of the project (never the person who made it)
create or replace function public.remove_member(p_project text, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_admin(p_project) then raise exception 'no access'; end if;
  delete from project_members where project_id = p_project and user_id = p_user;
end $$;

-- the person who made the project makes someone an organiser, or back to editing
create or replace function public.set_member_role(p_project text, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from projects where id = p_project and owner_id = auth.uid()) then raise exception 'no access'; end if;
  if p_role not in ('edita', 'organiza') then raise exception 'bad role'; end if;
  update project_members set role = p_role where project_id = p_project and user_id = p_user;
end $$;

revoke execute on function public.can_admin(text) from public, anon;
revoke execute on function public.can_create() from public, anon;
revoke execute on function public.remove_member(text, uuid) from public, anon;
revoke execute on function public.set_member_role(text, uuid, text) from public, anon;
revoke execute on function public.save_project(text, jsonb, jsonb, int, boolean) from public, anon;
grant execute on function public.can_admin(text) to authenticated;
grant execute on function public.can_create() to authenticated;
grant execute on function public.remove_member(text, uuid) to authenticated;
grant execute on function public.set_member_role(text, uuid, text) to authenticated;
grant execute on function public.save_project(text, jsonb, jsonb, int, boolean) to authenticated;
