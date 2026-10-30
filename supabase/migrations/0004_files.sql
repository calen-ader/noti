-- Noti 0004: files in a project (PDFs, images, audio). Run once in the Supabase SQL editor, after 0003.
--
-- Files live in a private storage bucket, one folder per project: files/<project id>/<file id>.<ext>.
-- Only people in the project can see, add or remove its files. The list of files (names, which song or date
-- each is linked to) is kept in the project itself, like its dates.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, 20971520, array['application/pdf', 'image/*', 'audio/*'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- the first folder of a file's path is its project
create policy files_read on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_edit((storage.foldername(name))[1]));
create policy files_add on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.can_edit((storage.foldername(name))[1]));
create policy files_change on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.can_edit((storage.foldername(name))[1]));
create policy files_remove on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.can_edit((storage.foldername(name))[1]));
