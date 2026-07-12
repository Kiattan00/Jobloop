-- JobLoop lightweight Supabase setup
-- 1. In Supabase Auth, enable Anonymous Sign-Ins before using this schema.
-- 2. Set env vars:
--    NEXT_PUBLIC_SUPABASE_URL
--    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

insert into storage.buckets (id, name, public)
values ('resume-pdfs', 'resume-pdfs', false)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.resume_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null,
  original_text text not null,
  pdf_file_name text,
  pdf_storage_path text,
  pdf_page_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_ai_output_id text,
  task_type text not null,
  provider text,
  model text,
  source_resume_id text,
  resume_version_ids text[] not null default '{}',
  job_ids text[] not null default '{}',
  input_summary text not null,
  output_ref_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_run_logs
  add column if not exists local_ai_output_id text,
  add column if not exists provider text,
  add column if not exists source_resume_id text,
  add column if not exists resume_version_ids text[] not null default '{}',
  add column if not exists job_ids text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists ai_run_logs_user_local_ai_output_id_key
on public.ai_run_logs (user_id, local_ai_output_id);

alter table public.resume_sources enable row level security;
alter table public.ai_run_logs enable row level security;

drop policy if exists "resume_sources_select_own" on public.resume_sources;
create policy "resume_sources_select_own"
on public.resume_sources
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "resume_sources_insert_own" on public.resume_sources;
create policy "resume_sources_insert_own"
on public.resume_sources
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "ai_run_logs_select_own" on public.ai_run_logs;
create policy "ai_run_logs_select_own"
on public.ai_run_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "ai_run_logs_insert_own" on public.ai_run_logs;
create policy "ai_run_logs_insert_own"
on public.ai_run_logs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "ai_run_logs_update_own" on public.ai_run_logs;
create policy "ai_run_logs_update_own"
on public.ai_run_logs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "resume_pdfs_insert_own" on storage.objects;
create policy "resume_pdfs_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "resume_pdfs_select_own" on storage.objects;
create policy "resume_pdfs_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
