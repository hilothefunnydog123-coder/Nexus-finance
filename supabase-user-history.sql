-- ════════════════════════════════════════════════════════════════════════
-- user_history — every forecast/analysis a signed-in user generates, saved to
-- their profile so they can revisit it as a shareable card or animated reel.
-- Run this in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.user_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('analysis', 'forecast')),
  ticker      text,
  title       text,
  summary     text,
  rating      text,                  -- e.g. "Strong Buy" | "BULL"
  confidence  numeric,               -- 0..100
  price       numeric,               -- price at the time
  target      numeric,               -- price target / forecast endpoint
  pct         numeric,               -- predicted/derived % move
  payload     jsonb not null default '{}'::jsonb,  -- full snapshot for re-rendering
  created_at  timestamptz not null default now()
);

create index if not exists user_history_user_idx
  on public.user_history (user_id, created_at desc);

create index if not exists user_history_ticker_idx
  on public.user_history (user_id, ticker);

-- Row level security: a user can only see/manage their own rows.
-- (The /api/history route uses the service role and validates the caller's
--  JWT, but RLS keeps direct client access safe too.)
alter table public.user_history enable row level security;

drop policy if exists "own rows: select" on public.user_history;
create policy "own rows: select" on public.user_history
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.user_history;
create policy "own rows: insert" on public.user_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.user_history;
create policy "own rows: delete" on public.user_history
  for delete using (auth.uid() = user_id);
