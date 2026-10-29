-- Fence Mate account job sync.
-- Run this in the Supabase SQL Editor for the same project as SUPABASE_URL.
create table if not exists public.fence_mate_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint fence_mate_jobs_user_job_unique unique (user_id, job_id)
);

alter table public.fence_mate_jobs enable row level security;
revoke all on table public.fence_mate_jobs from anon;
grant select, insert, update, delete on table public.fence_mate_jobs to authenticated;

drop policy if exists "Users can read their own Fence Mate jobs" on public.fence_mate_jobs;
create policy "Users can read their own Fence Mate jobs"
  on public.fence_mate_jobs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Fence Mate jobs" on public.fence_mate_jobs;
create policy "Users can insert their own Fence Mate jobs"
  on public.fence_mate_jobs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Fence Mate jobs" on public.fence_mate_jobs;
create policy "Users can update their own Fence Mate jobs"
  on public.fence_mate_jobs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Fence Mate jobs" on public.fence_mate_jobs;
create policy "Users can delete their own Fence Mate jobs"
  on public.fence_mate_jobs for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists fence_mate_jobs_user_updated_idx
  on public.fence_mate_jobs (user_id, updated_at desc);
