-- ════════════════════════════════════════════════════════════════════════
-- The Arena — RIVAL AI opponents' sealed calls.
--
-- BrainStock (the "house") posts a daily sealed prediction per ticker into
-- arena_calls. For every one of those bouts, a roster of rival AIs takes its
-- OWN side — some agree with the net, some oppose it — and each opponent call
-- is sealed the exact same cryptographic way: its immutable core (ticker,
-- direction, target, start_price, horizon, resolve_date, sealed_at) is hashed
-- into a leaf via lib/arena/seal#callLeaf. The leaf freezes the opponent's
-- position at commit time, so it can later be proven un-edited / un-backdated,
-- just like the net's calls.
--
-- Server-only table: all access is via the service-role key in API routes
-- (same pattern as arena_calls / prediction_log), so RLS is left off.
-- Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.arena_opponent_calls (
  id            bigserial   primary key,
  trade_date    date        not null,
  ticker        text        not null,
  opponent_id   text        not null,             -- stable roster id (e.g. 'momentum')
  opponent_name text        not null,             -- display name (e.g. 'Momentum Mike')
  kind          text        not null,             -- 'bot' (deterministic) | 'llm' (persona)
  direction     text        not null,             -- 'up' | 'down' (this opponent's side)
  conviction    numeric     not null,             -- 0..100 confidence in the call
  rationale     text,                              -- short human-readable reasoning
  start_price   numeric     not null,             -- spot at seal time (the shared line)
  target        numeric     not null,             -- opponent's horizon target price
  horizon       int         not null default 5,
  resolve_date  date        not null,
  sealed_at     timestamptz not null,             -- frozen commit timestamp (hashed)
  leaf_hash     text        not null,             -- SHA-256 of the canonical sealed core
  -- grading fills in later; not part of the seal (outcome must stay mutable)
  status        text        not null default 'sealed',  -- sealed | hit | miss
  dir_correct   boolean,
  actual_price  numeric,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (trade_date, ticker, opponent_id)
);

create index if not exists arena_opp_date_idx   on public.arena_opponent_calls (trade_date);
create index if not exists arena_opp_status_idx on public.arena_opponent_calls (opponent_id, status);

comment on column public.arena_opponent_calls.leaf_hash is
  'SHA-256(0x00 || trade_date|TICKER|direction|start_price(4)|target(4)|horizon|resolve_date|sealed_at). The per-call commitment, computed by lib/arena/seal#callLeaf over the opponent''s own SealedCallCore — identical scheme to arena_calls so opponent calls are equally tamper-evident.';
comment on column public.arena_opponent_calls.sealed_at is
  'Commit timestamp, frozen at seal time and included in the hash — this is what backdating would have to change.';

comment on table public.arena_opponent_calls is
  'One sealed call per (trade_date, ticker, opponent). The rival AIs that take their own side against BrainStock''s arena_calls, sealed the same Merkle-leaf way.';
