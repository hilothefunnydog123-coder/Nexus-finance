-- YN Edge — the moat ledger. Every market we price is logged the moment we price
-- it (our probability, the market's, the side, edge, EV, Kelly, the worth-it
-- verdict). When Kalshi resolves the market, the row is graded: Brier score, hit
-- rate, and the realized ROI of the "worth it" picks. Un-cherry-picked, public.
-- Run in Supabase. Service-role only (RLS on, no public policies).

create table if not exists edge_log (
  id             bigserial   primary key,
  priced_date    date        not null,
  market_ticker  text        not null,
  title          text        not null,
  category       text        not null default 'Other',
  engine         text        not null default 'baseline',  -- brainstock-nn | gemini-grounded | baseline
  yn_prob        numeric     not null,                      -- OUR P(YES) at pricing time
  market_prob    numeric     not null,                      -- market's implied P(YES)
  side           text        not null,                      -- YES | NO (the side we'd take)
  edge           numeric     not null,                      -- our% - market% on our side
  ev_per_dollar  numeric     not null,
  kelly          numeric     not null,
  confidence     numeric     not null,
  worth_it       boolean     not null default false,
  close_time     timestamptz not null,
  status         text        not null default 'open',       -- open | settled
  result         text,                                      -- yes | no  (actual outcome)
  brier          numeric,                                   -- (yn_prob - outcome)^2
  side_correct   boolean,                                   -- did our chosen side win
  pnl_per_dollar numeric,                                   -- realized profit per $1 if we'd bet our side
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  unique (market_ticker, priced_date)                       -- one snapshot per market per day
);

create index if not exists edge_log_open_idx     on edge_log (status, close_time);
create index if not exists edge_log_worth_idx    on edge_log (worth_it, status);
create index if not exists edge_log_category_idx on edge_log (category);

alter table edge_log enable row level security; -- service-role only
