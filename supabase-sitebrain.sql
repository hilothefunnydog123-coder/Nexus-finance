-- ════════════════════════════════════════════════════════════════════════════
-- YN Finance — SITE BRAIN: behavioral learning layer
-- Run this in the Supabase SQL editor. Everything degrades gracefully if absent.
-- ════════════════════════════════════════════════════════════════════════════

-- Append-only behavior event log. Cookieless visitor id (vid), optional user id.
create table if not exists behavior_events (
  id     bigserial primary key,
  ts     timestamptz not null default now(),
  vid    text not null,                 -- anonymous visitor id (localStorage)
  uid    uuid,                          -- logged-in user (nullable)
  sid    text,                          -- session id
  type   text not null,                 -- pageview|click|dwell|scroll|ticker|convert|impression
  path   text,
  target text,                          -- feature key / cta / ticker / frame id
  value  real,                          -- dwell ms, scroll %, etc.
  meta   jsonb
);
create index if not exists behavior_events_vid_ts  on behavior_events (vid, ts desc);
create index if not exists behavior_events_type_ts on behavior_events (type, ts desc);
create index if not exists behavior_events_tgt      on behavior_events (target, type);

-- Optional rollup for the multi-armed bandit (home-frame ordering). The API can
-- also compute these on the fly from behavior_events; this table just makes the
-- owner dashboard cheap once traffic grows.
create table if not exists brain_arms (
  surface     text not null,            -- e.g. 'home_frames'
  arm         text not null,            -- feature key
  segment     text not null default 'all',
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (surface, arm, segment)
);

-- Atomic increment helper for arm stats (called from /api/brain/track).
create or replace function brain_bump_arm(p_surface text, p_arm text, p_seg text, p_imp int, p_clk int)
returns void language sql as $$
  insert into brain_arms (surface, arm, segment, impressions, clicks, updated_at)
  values (p_surface, p_arm, coalesce(p_seg,'all'), greatest(p_imp,0), greatest(p_clk,0), now())
  on conflict (surface, arm, segment) do update
    set impressions = brain_arms.impressions + greatest(p_imp,0),
        clicks      = brain_arms.clicks      + greatest(p_clk,0),
        updated_at  = now();
$$;

-- RLS: writes go through the service-role API only; no public access needed.
alter table behavior_events enable row level security;
alter table brain_arms      enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- SITE BRAIN v2 — a real (shallow) neural net + self-evolving experiments
-- ════════════════════════════════════════════════════════════════════════════

-- The model: a single row holding the trained feature-embedding matrix + biases
-- (logistic matrix factorization). Visitor embeddings are inferred at request
-- time from each visitor's own events, so nothing per-user is stored here.
create table if not exists brain_model (
  id         int primary key default 1,
  dim        int not null default 8,
  weights    jsonb not null default '{}'::jsonb,   -- { feats: { key: { v:[...], b:number } }, meta }
  trained_n  bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint brain_model_singleton check (id = 1)
);

-- Self-evolving A/B experiments. The net picks variants (Thompson sampling) and
-- auto-promotes winners by conversion.
create table if not exists brain_experiments (
  exp         text not null,
  variant     text not null,
  impressions bigint not null default 0,
  conversions bigint not null default 0,
  promoted    boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (exp, variant)
);

create or replace function brain_bump_variant(p_exp text, p_variant text, p_imp int, p_conv int)
returns void language sql as $$
  insert into brain_experiments (exp, variant, impressions, conversions, updated_at)
  values (p_exp, p_variant, greatest(p_imp,0), greatest(p_conv,0), now())
  on conflict (exp, variant) do update
    set impressions = brain_experiments.impressions + greatest(p_imp,0),
        conversions = brain_experiments.conversions + greatest(p_conv,0),
        updated_at  = now();
$$;

alter table brain_model       enable row level security;
alter table brain_experiments enable row level security;
