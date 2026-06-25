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
