-- BrainStock: bear board column, forecast track record, email subscribers.
-- Run once in the Supabase SQL editor (in addition to supabase-daily-picks.sql).

-- 1) Bear list on the daily board
alter table public.daily_picks
  add column if not exists bears jsonb not null default '[]'::jsonb;

-- 2) Track record — one row per AI call, resolved later against real prices
create table if not exists public.forecast_calls (
  id          bigserial primary key,
  trade_date  date not null,
  ticker      text not null,
  start_price numeric not null,
  target      numeric not null,
  pct         numeric not null,
  horizon     int not null default 5,
  resolve_date date not null,
  status      text not null default 'open',   -- open | hit | miss
  actual_price numeric,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (trade_date, ticker)
);
create index if not exists forecast_calls_status_idx on public.forecast_calls (status, resolve_date);
create index if not exists forecast_calls_resolved_idx on public.forecast_calls (resolved_at);

-- 3) Daily email subscribers (watchlist optional)
create table if not exists public.subscribers (
  email      text primary key,
  tickers    text[] not null default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS on; all writes/reads happen server-side via the service-role key (bypasses RLS).
-- subscribers stays private (PII); forecast_calls is read through the server API.
alter table public.forecast_calls enable row level security;
alter table public.subscribers   enable row level security;
