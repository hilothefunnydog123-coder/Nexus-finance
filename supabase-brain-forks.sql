-- ════════════════════════════════════════════════════════════════════════
-- brain_forks — a user's saved "fork" of BrainStock (their feature-weight
-- preset) + its backtest score, for the public leaderboard. Run in Supabase.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.brain_forks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  weights      jsonb not null default '[]'::jsonb,   -- 11 feature multipliers
  conviction   numeric not null default 1,
  score        numeric,                              -- backtest directional accuracy %
  display_name text,                                 -- owner's first name, for the board
  created_at   timestamptz not null default now()
);

-- idempotent column adds for existing installs
alter table public.brain_forks add column if not exists score numeric;
alter table public.brain_forks add column if not exists display_name text;

create index if not exists brain_forks_user_idx  on public.brain_forks (user_id, created_at desc);
create index if not exists brain_forks_score_idx on public.brain_forks (score desc nulls last);

alter table public.brain_forks enable row level security;

drop policy if exists "own forks: select" on public.brain_forks;
create policy "own forks: select" on public.brain_forks
  for select using (auth.uid() = user_id);

drop policy if exists "own forks: insert" on public.brain_forks;
create policy "own forks: insert" on public.brain_forks
  for insert with check (auth.uid() = user_id);

drop policy if exists "own forks: delete" on public.brain_forks;
create policy "own forks: delete" on public.brain_forks
  for delete using (auth.uid() = user_id);

-- public leaderboard read (anon can see the board; the API also exposes it via service role)
drop policy if exists "leaderboard: public read" on public.brain_forks;
create policy "leaderboard: public read" on public.brain_forks
  for select using (score is not null);
