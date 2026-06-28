-- ════════════════════════════════════════════════════════════════════════
-- The Arena — public leaderboard standings (Elo ladder).
--
-- One row per participant on the ladder: BrainStock (the "house") plus every
-- rival AI that takes its own side in arena_opponent_calls. Standings are a
-- DERIVED table — recomputed from scratch (idempotent) by
-- POST /api/arena/leaderboard, which replays every graded bout (one ticker on
-- one trade_date) through a round-robin Elo update. Nothing here is authored
-- by hand; it is a materialized projection of the graded calls.
--
-- Server-only table: all access is via the service-role key in API routes
-- (same pattern as arena_calls / arena_opponent_calls), so RLS is left off.
-- Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.arena_standings (
  participant_id   text        primary key,            -- 'brainstock' | opponent_id
  participant_type text        not null,               -- 'net' | 'opponent'
  display_name     text        not null,               -- 'BrainStock' | opponent_name
  rating           numeric     not null default 1500,  -- Elo rating (starts at 1500)
  bouts            int         default 0,               -- graded bouts participated in
  wins             int         default 0,               -- bouts won (correct while a peer missed)
  losses           int         default 0,               -- bouts lost (wrong while a peer was right)
  pushes           int         default 0,               -- all-correct / all-wrong bouts (no edge)
  streak           int         default 0,               -- current run (+ wins, - losses)
  best_streak      int         default 0,               -- longest winning run
  pnl_pct          numeric     default 0,               -- cumulative P&L % (provenance, optional)
  last_bout_date   date,                                -- trade_date of most recent graded bout
  updated_at       timestamptz default now()
);

create index if not exists arena_standings_rating_idx on public.arena_standings (rating desc);

comment on table public.arena_standings is
  'Derived Elo leaderboard for The Arena. Recomputed idempotently from all graded arena_calls + arena_opponent_calls by POST /api/arena/leaderboard via a round-robin update per (trade_date, ticker) bout.';
comment on column public.arena_standings.rating is
  'Elo rating; everyone starts at 1500. A bout is one ticker on one day; every pair of graded participants is scored head-to-head by who called direction correctly.';
comment on column public.arena_standings.streak is
  'Signed current run: positive = consecutive bout wins, negative = consecutive losses; resets/flips on outcome change, unchanged on pushes.';
