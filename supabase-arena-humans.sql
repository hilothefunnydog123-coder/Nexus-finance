-- ════════════════════════════════════════════════════════════════════════
-- The Arena — humans enter.
--
-- A signed-in user can pick a side on any live sealed bout. Their pick is
-- sealed at pick time (leaf_hash over direction + line + timestamp) so it can't
-- be backdated, graded against real prices by the same loop as the models, and
-- rolled up into a personal record + a shareable "I beat the AIs" card.
--
-- Server-only table (service-role access in the API routes); RLS left off to
-- match the rest of the Arena. Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.arena_human_picks (
  id           bigserial   primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  handle       text,                                -- display name at pick time
  trade_date   date        not null,
  ticker       text        not null,
  direction    text        not null,               -- 'up' | 'down' (the human's side)
  start_price  numeric     not null,               -- the line when they locked in
  horizon      int         not null default 5,
  resolve_date date        not null,
  sealed_at    timestamptz not null,               -- pick time, frozen + hashed
  leaf_hash    text        not null,               -- SHA-256 seal over the pick
  status       text        not null default 'sealed', -- sealed | hit | miss
  actual_price numeric,
  dir_correct  boolean,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, trade_date, ticker)             -- one locked pick per bout
);

create index if not exists arena_human_picks_user_idx  on public.arena_human_picks (user_id, status);
create index if not exists arena_human_picks_grade_idx on public.arena_human_picks (status, resolve_date);

comment on column public.arena_human_picks.leaf_hash is
  'SHA-256 seal over the human pick (date|ticker|direction|line|sealed_at) — so a pick can be proven un-backdated, exactly like the models.';
