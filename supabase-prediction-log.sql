-- The data flywheel — every forecast the platform serves becomes a labeled,
-- auto-graded training example. This is the proprietary dataset a copier can't
-- fast-forward: more usage -> more labels -> a smarter model. Run in Supabase.

create table if not exists prediction_log (
  id           bigserial   primary key,
  trade_date   date        not null,
  ticker       text        not null,
  source       text        not null default 'forecast',   -- forecast | voice | analyzer
  start_price  numeric     not null,
  predicted    numeric     not null,                       -- model's end-of-horizon price
  horizon      int         not null default 5,
  resolve_date date        not null,
  status       text        not null default 'open',        -- open | hit | miss
  actual_price numeric,
  dir_correct  boolean,                                    -- did we call the direction right
  abs_err_pct  numeric,                                    -- |actual - predicted| / start, %
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  unique (trade_date, ticker, source)                      -- one label per ticker/day/source
);

create index if not exists prediction_log_open_idx on prediction_log (status, resolve_date);
create index if not exists prediction_log_ticker_idx on prediction_log (ticker);

alter table prediction_log enable row level security; -- service-role only
