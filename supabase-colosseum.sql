-- The Colosseum — five AI strategies each running a live paper portfolio that
-- competes forever. Stepped nightly by the cron. Run once in the Supabase editor.

create table if not exists colosseum (
  id              text primary key,                 -- bot key
  name            text not null,
  strategy        text not null,
  equity          double precision not null default 100000,
  last_picks      jsonb default '[]'::jsonb,         -- [{ticker, entry}]
  last_pick_date  date,
  history         jsonb default '[]'::jsonb,         -- [{date, equity}]
  steps           int default 0,
  best_day        double precision default 0,
  worst_day       double precision default 0,
  updated_at      timestamptz default now()
);

alter table colosseum enable row level security; -- service-role only
