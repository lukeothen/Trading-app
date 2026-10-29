-- Fence Mate beta waitlist
-- Run once in Supabase SQL Editor before enabling the public signup page.
create table if not exists public.fence_mate_beta_signups (
  id uuid primary key,
  email text not null unique check (char_length(email) between 3 and 254),
  role text not null check (role in (
    'Fencing contractor',
    'Landscaper / groundworker',
    'Builder / other trade',
    'Supplier',
    'Other'
  )),
  consent boolean not null default false check (consent = true),
  consented_at timestamptz not null,
  source text not null default 'fence_mate_beta_page',
  created_at timestamptz not null default now()
);

alter table public.fence_mate_beta_signups enable row level security;
revoke all on table public.fence_mate_beta_signups from anon, authenticated;
-- No public RLS policies: reads and writes are only performed by the server function
-- using the server-side Supabase secret key stored in Netlify environment variables.
