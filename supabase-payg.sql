-- Pay-as-it-wins subscribers — "you only pay when the AI is right."
-- Card is saved at checkout (Stripe setup mode); a monthly cron computes
-- min($20, wins x $0.25) and charges ONCE per cycle. Run in Supabase SQL editor.

create table if not exists payg_subscribers (
  id                  uuid        primary key default gen_random_uuid(),
  email               text        not null,
  stripe_customer_id  text        not null unique,
  status              text        not null default 'active',   -- active | canceled
  cycle_start         timestamptz not null default now(),      -- wins counted from here
  last_billed_at      timestamptz,
  last_charge_cents   integer     default 0,
  lifetime_cents      integer     default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_payg_email       on payg_subscribers(email);
create index if not exists idx_payg_customer     on payg_subscribers(stripe_customer_id);
create index if not exists idx_payg_status       on payg_subscribers(status);

alter table payg_subscribers enable row level security;
-- No public policies — all access is server-side via the service-role key.

-- NOTE: billing reads winning calls from public.forecast_calls (status = 'hit').
-- Make sure that table has resolved_at populated (track-record POST sets it).
