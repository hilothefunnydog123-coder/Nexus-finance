-- ════════════════════════════════════════════════════════════════════════
-- postmortems — cached AI explanations of why a graded BrainStock call MISSED.
-- The whole point of the public record is honesty; this makes the misses
-- teach something. One row per (ticker, trade_date); generated once, reused.
-- Run in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.postmortems (
  id          uuid primary key default gen_random_uuid(),
  ticker      text not null,
  trade_date  date not null,
  start_price numeric,
  actual_price numeric,
  ret_pct     numeric,
  explanation text not null,
  created_at  timestamptz not null default now(),
  unique (ticker, trade_date)
);

create index if not exists postmortems_lookup_idx on public.postmortems (ticker, trade_date);
