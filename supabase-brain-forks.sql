-- ════════════════════════════════════════════════════════════════════════
-- brain_forks — a user's saved "fork" of BrainStock: their own feature-weight
-- preset that changes what the neural net pays attention to. Saved to profile.
-- Run in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.brain_forks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  weights     jsonb not null default '[]'::jsonb,   -- 11 feature multipliers
  conviction  numeric not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists brain_forks_user_idx on public.brain_forks (user_id, created_at desc);

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
