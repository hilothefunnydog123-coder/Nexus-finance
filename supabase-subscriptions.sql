-- ─── YN Daily Intelligence — Subscriptions Table ────────────────────────────
-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)
-- This is separate from supabase-schema.sql so existing tables are not affected.

create table if not exists subscriptions (
  id                    uuid        primary key default gen_random_uuid(),
  stripe_customer_id    text        not null unique,
  stripe_subscription_id text       not null unique,
  email                 text        not null,
  status                text        not null default 'active',
  plan                  text        not null default 'daily_intel',
  price_cents           integer     not null default 1199,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean     default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_subscriptions_email        on subscriptions(email);
create index if not exists idx_subscriptions_customer_id  on subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_sub_id       on subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status       on subscriptions(status);

-- RLS: enable but service_role key bypasses it (used in webhook)
alter table subscriptions enable row level security;

-- Allow service_role full access (webhook uses this)
-- No public policies — all writes happen server-side via service_role key
