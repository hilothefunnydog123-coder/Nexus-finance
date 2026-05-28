-- ─── YN Finance — Public API Keys Table ──────────────────────────────────────
-- Run in Supabase SQL Editor (supabase.com → project → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

create table if not exists public.api_keys (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        references auth.users on delete cascade,
  user_email              text        not null,
  key_hash                text        not null unique,
  key_prefix              text        not null unique,
  tier                    text        not null default 'free'
                                        check (tier in ('free','pro','enterprise')),
  name                    text        not null default 'My App',
  calls_month             integer     not null default 0,
  calls_total             integer     not null default 0,
  is_active               boolean     not null default true,
  stripe_subscription_id  text,
  stripe_customer_id      text,
  created_at              timestamptz default now(),
  last_used_at            timestamptz
);

-- Add user_id if table already existed without it
alter table public.api_keys add column if not exists user_id uuid references auth.users on delete cascade;

create index if not exists idx_api_keys_email    on api_keys(user_email);
create index if not exists idx_api_keys_user_id  on api_keys(user_id);
create index if not exists idx_api_keys_hash     on api_keys(key_hash);
create index if not exists idx_api_keys_prefix   on api_keys(key_prefix);
create index if not exists idx_api_keys_active   on api_keys(is_active);

alter table public.api_keys enable row level security;
-- All access goes through server-side service_role key — no direct client policies needed.

-- ─── Developer signups / contacts table ──────────────────────────────────────
-- Tracks every developer who registers for the API. Used for email marketing
-- and analytics. Updated on magic link requests and key claims.

create table if not exists public.developer_signups (
  id                  uuid        primary key default gen_random_uuid(),
  email               text        not null unique,
  user_id             uuid        references auth.users on delete set null,
  tier                text        not null default 'free',
  key_prefix          text,
  source              text        default 'developers_page',
  last_magic_link_at  timestamptz,
  signed_up_at        timestamptz default now()
);

create index if not exists idx_dev_signups_email   on developer_signups(email);
create index if not exists idx_dev_signups_user_id on developer_signups(user_id);

alter table public.developer_signups enable row level security;
-- Service-role key only — no direct client access.
