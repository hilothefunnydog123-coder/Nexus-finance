-- Daily AI Bull Board — one row per trading session.
-- Run once in the Supabase SQL editor.

create table if not exists public.daily_picks (
  trade_date   date primary key,
  generated_at timestamptz not null default now(),
  picks        jsonb not null default '[]'::jsonb,
  attempted    int  not null default 0,
  succeeded    int  not null default 0
);

-- Public read (the board is shown on the landing page); writes are server-side
-- only via the service-role key, which bypasses RLS.
alter table public.daily_picks enable row level security;

drop policy if exists "daily_picks read" on public.daily_picks;
create policy "daily_picks read" on public.daily_picks
  for select using (true);
