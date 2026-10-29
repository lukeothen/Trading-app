-- Fence Mate anonymous usage analytics (prototype)
-- Run this in Supabase SQL Editor. This table is for product-usage events only:
-- do not store customer names, job notes, measurements, AI prompts, photos, emails or quotes.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'app_open',
    'tool_open',
    'materials_calculated',
    'job_saved',
    'checklist_saved',
    'gate_calculated',
    'cuts_calculated',
    'netting_calculated',
    'ai_request_started',
    'ai_request_succeeded',
    'ai_request_failed',
    'avs_lookup_started',
    'avs_lookup_succeeded',
    'avs_lookup_failed',
    'estimate_saved',
    'quote_shared'
  )),
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object' and octet_length(properties::text) <= 1000
  ),
  created_at timestamptz not null default now()
);

create index if not exists app_events_created_at_idx on public.app_events (created_at desc);
create index if not exists app_events_event_name_created_at_idx on public.app_events (event_name, created_at desc);

alter table public.app_events enable row level security;

-- Anonymous visitors may submit only allow-listed, small events.
-- No public read/update/delete policy is created.
revoke all on table public.app_events from anon, authenticated;
grant insert on table public.app_events to anon;

drop policy if exists "Allow anonymous allow-listed analytics inserts" on public.app_events;
create policy "Allow anonymous allow-listed analytics inserts"
on public.app_events
for insert
to anon
with check (
  event_name in (
    'app_open',
    'tool_open',
    'materials_calculated',
    'job_saved',
    'checklist_saved',
    'gate_calculated',
    'cuts_calculated',
    'netting_calculated',
    'ai_request_started',
    'ai_request_succeeded',
    'ai_request_failed',
    'avs_lookup_started',
    'avs_lookup_succeeded',
    'avs_lookup_failed',
    'estimate_saved',
    'quote_shared'
  )
  and session_id is not null
  and jsonb_typeof(properties) = 'object'
  and octet_length(properties::text) <= 1000
);

comment on table public.app_events is 'Anonymous Fence Mate product usage events; no job/customer content should be stored.';
