-- ================================================================
-- YN Finance — Agent Network Schema
-- Run in Supabase SQL Editor → New Query
-- ================================================================

create table if not exists public.agent_signals (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  agent_name  text        not null,
  ticker      text,
  signal_text text        not null,
  conviction  smallint    default 1 check (conviction between 1 and 3),
  source_url  text,
  raw_data    jsonb,
  expires_at  timestamptz default (now() + interval '24 hours')
);

create index if not exists agent_signals_agent_idx   on public.agent_signals(agent_name);
create index if not exists agent_signals_ticker_idx  on public.agent_signals(ticker);
create index if not exists agent_signals_created_idx on public.agent_signals(created_at desc);
create index if not exists agent_signals_expires_idx on public.agent_signals(expires_at);

alter table public.agent_signals enable row level security;
create policy "Anyone reads agent signals"    on public.agent_signals for select using (true);
create policy "Service inserts agent signals" on public.agent_signals for insert with check (true);
create policy "Service deletes agent signals" on public.agent_signals for delete using (true);

-- ----------------------------------------------------------------

create table if not exists public.convergence_alerts (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  ticker      text        not null,
  agent_count smallint    not null,
  agents      text[]      not null,
  alert_text  text        not null
);

create index if not exists convergence_created_idx on public.convergence_alerts(created_at desc);
create index if not exists convergence_ticker_idx  on public.convergence_alerts(ticker);

alter table public.convergence_alerts enable row level security;
create policy "Anyone reads convergence alerts"    on public.convergence_alerts for select using (true);
create policy "Service inserts convergence alerts" on public.convergence_alerts for insert with check (true);
