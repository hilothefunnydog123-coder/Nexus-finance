-- ════════════════════════════════════════════════════════════════════════
-- The Arena — sealed calls + daily Merkle root.
--
-- Every morning the neural net posts predictions. Each is hashed into a leaf
-- over its immutable fields (ticker, direction, target, seal timestamp, …) and
-- all of a day's leaves roll up into one Merkle root, signed with
-- PROVENANCE_SECRET. The signed root commits to the whole set, so editing or
-- backdating any call — or deleting a losing one — changes the recomputed root
-- and is mathematically detectable via /api/arena/verify.
--
-- Server-only tables: all access is via the service-role key in API routes
-- (same pattern as prediction_log / nn_model), so RLS is left off.
-- Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

-- ── One sealed call (one leaf). ───────────────────────────────────────────
create table if not exists public.arena_calls (
  id           bigserial   primary key,
  trade_date   date        not null,
  ticker       text        not null,
  direction    text        not null,              -- 'up' | 'down' (sign of target - start)
  start_price  numeric     not null,              -- spot at seal time (the line)
  target       numeric     not null,              -- net's horizon target price
  pct          numeric     not null,              -- (target - start) / start * 100
  horizon      int         not null default 5,
  resolve_date date        not null,
  sealed_at    timestamptz not null,              -- frozen commit timestamp (hashed)
  leaf_hash    text        not null,              -- SHA-256 of the canonical core
  engine       text,                              -- 'neural-net' | 'baseline'
  skill        numeric,                           -- backtest skill score (provenance, not hashed)
  dir_acc      numeric,                           -- backtest directional accuracy (not hashed)
  -- grading fills in later; not part of the seal (outcome must stay mutable)
  status       text        not null default 'sealed',  -- sealed | hit | miss
  actual_price numeric,
  dir_correct  boolean,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (trade_date, ticker)
);

create index if not exists arena_calls_date_idx on public.arena_calls (trade_date);
create index if not exists arena_calls_leaf_idx on public.arena_calls (leaf_hash);
create index if not exists arena_calls_status_idx on public.arena_calls (status, resolve_date);

comment on column public.arena_calls.leaf_hash is
  'SHA-256(0x00 || trade_date|TICKER|direction|start_price(4)|target(4)|horizon|resolve_date|sealed_at). The per-call commitment.';
comment on column public.arena_calls.sealed_at is
  'Commit timestamp, frozen at seal time and included in the hash — this is what backdating would have to change.';

-- ── One Merkle root per day (commits to that day's whole leaf set). ────────
create table if not exists public.arena_seals (
  trade_date  date        primary key,
  merkle_root text        not null,               -- root over all of the day's leaves (sorted by ticker)
  leaf_count  int         not null,
  root_sig    text,                               -- HMAC-SHA256(merkle_root, PROVENANCE_SECRET)
  alg         text        not null default 'sha256',
  prev_root   text,                               -- previous day's merkle_root
  chain_hash  text        not null,               -- SHA-256(prev_chain_hash || merkle_root)
  anchor_ref  text,                               -- external timestamp anchor (e.g. OpenTimestamps) — optional
  sealed_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists arena_seals_created_idx on public.arena_seals (created_at desc);

comment on table public.arena_seals is
  'Daily commitment. merkle_root + root_sig pin the entire set of arena_calls for trade_date; chain_hash links days into an append-only chain.';
