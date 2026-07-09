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
  task_type text not null,
  model text,
  input_summary text not null,
  output_ref_id text not null,
  created_at timestamptz not null default now()
);

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
