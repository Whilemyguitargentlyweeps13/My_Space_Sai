-- Journal media is public so published posts can display it. The editor can write it only as an allowlisted portfolio admin.
-- Plain-text journal backups stay in a private bucket and are readable only by an allowlisted admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'portfolio-journal-media',
    'portfolio-journal-media',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg']
  ),
  (
    'portfolio-journal-text',
    'portfolio-journal-text',
    false,
    2097152,
    array['text/plain']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read published journal media" on storage.objects;
create policy "Public can read published journal media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'portfolio-journal-media');

drop policy if exists "Portfolio admins upload journal media" on storage.objects;
create policy "Portfolio admins upload journal media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-journal-media' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins update journal media" on storage.objects;
create policy "Portfolio admins update journal media"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-journal-media' and public.is_portfolio_admin())
  with check (bucket_id = 'portfolio-journal-media' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins delete journal media" on storage.objects;
create policy "Portfolio admins delete journal media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-journal-media' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins read journal text copies" on storage.objects;
create policy "Portfolio admins read journal text copies"
  on storage.objects for select to authenticated
  using (bucket_id = 'portfolio-journal-text' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins upload journal text copies" on storage.objects;
create policy "Portfolio admins upload journal text copies"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-journal-text' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins update journal text copies" on storage.objects;
create policy "Portfolio admins update journal text copies"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-journal-text' and public.is_portfolio_admin())
  with check (bucket_id = 'portfolio-journal-text' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins delete journal text copies" on storage.objects;
create policy "Portfolio admins delete journal text copies"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-journal-text' and public.is_portfolio_admin());
