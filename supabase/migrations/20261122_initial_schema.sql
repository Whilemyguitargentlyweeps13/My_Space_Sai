-- Portfolio content schema for Supabase.
-- File bytes stay in GitHub or object storage; this database stores metadata and references.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  status text not null default 'To confirm'
    check (status in ('Completed', 'In Progress', 'Prototype', 'Research', 'Archived', 'To confirm')),
  summary text not null,
  overview text not null,
  project_focus text,
  core_question text,
  technologies text[] not null default '{}',
  system_map jsonb not null default '{}'::jsonb,
  available_details jsonb not null default '[]'::jsonb,
  engineering_questions jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  intro text not null,
  content jsonb not null default '[]'::jsonb,
  cover_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  kind text not null default 'document'
    check (kind in ('report', 'schematic', 'pcb', 'image', 'source', 'demo', 'other')),
  storage_provider text not null default 'github'
    check (storage_provider in ('github', 'supabase_storage', 'external')),
  file_url text,
  storage_path text,
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint project_file_reference_required check (file_url is not null or storage_path is not null)
);

create index if not exists project_files_project_order_idx
  on public.project_files(project_id, sort_order);
create index if not exists articles_publish_order_idx
  on public.articles(is_published, published_at desc);

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolio_admins
    where user_id = (select auth.uid())
  );
$$;

alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.project_files enable row level security;
alter table public.portfolio_admins enable row level security;

grant select on public.projects, public.articles, public.project_files to anon, authenticated;
grant insert, update, delete on public.projects, public.articles, public.project_files to authenticated;
grant select on public.portfolio_admins to authenticated;

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Portfolio admins manage projects" on public.projects;
create policy "Portfolio admins manage projects"
  on public.projects for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Portfolio admins manage articles" on public.articles;
create policy "Portfolio admins manage articles"
  on public.articles for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Public can read files for published projects" on public.project_files;
create policy "Public can read files for published projects"
  on public.project_files for select to anon, authenticated
  using (
    visibility = 'public'
    and exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
        and projects.is_published = true
    )
  );

drop policy if exists "Portfolio admins manage project files" on public.project_files;
create policy "Portfolio admins manage project files"
  on public.project_files for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Portfolio admins can read their admin row" on public.portfolio_admins;
create policy "Portfolio admins can read their admin row"
  on public.portfolio_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- After creating your Supabase Auth user, add your user UUID here using the SQL editor:
-- insert into public.portfolio_admins (user_id) values ('YOUR_AUTH_USER_UUID');
