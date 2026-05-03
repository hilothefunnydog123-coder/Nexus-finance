-- ================================================================
-- YN Finance — Supabase Schema
-- Run this in your Supabase project → SQL Editor → New Query
-- ================================================================

-- User profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  email text,
  avatar_color text default '#00d4aa',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Challenges table
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  email text not null,
  username text,
  tier text not null,               -- 'starter' | 'pro' | 'elite'
  account_size integer not null,
  profit_target numeric not null,
  max_drawdown numeric not null,
  daily_loss_limit numeric not null,
  min_trading_days integer not null,
  max_days integer not null,
  status text default 'active',     -- 'active' | 'passed' | 'failed' | 'payout_requested' | 'paid'
  started_at timestamptz default now(),
  passed_at timestamptz,
  failed_at timestamptz,
  payout_requested_at timestamptz,
  paid_at timestamptz,
  current_pnl_pct numeric default 0,
  peak_equity numeric default 0,
  current_drawdown numeric default 0,
  trading_days integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trade-room messages (may already exist)
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  emoji text default '💬',
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  username text not null,
  content text not null,
  avatar_color text default '#7f93b5',
  created_at timestamptz default now()
);

-- Seed channels
insert into public.channels (name, description, emoji) values
  ('general',     'General discussion',        '💬'),
  ('stocks',      'Stock trading ideas',        '📈'),
  ('forex',       'Forex market analysis',      '💱'),
  ('futures',     'Futures & commodities',      '⚡'),
  ('crypto',      'Crypto discussion',          '₿'),
  ('trade-ideas', 'Share your setups',          '🎯')
on conflict (name) do nothing;

-- ── Row Level Security ──
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.messages enable row level security;
alter table public.channels enable row level security;

-- Profiles: users see their own
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Challenges: users only see/edit their own
create policy "Users see own challenges"     on challenges for select using (auth.uid() = user_id);
create policy "Users insert own challenges"  on challenges for insert  with check (auth.uid() = user_id);
create policy "Users update own challenges"  on challenges for update  using (auth.uid() = user_id);

-- Messages: public read, authenticated write
create policy "Anyone reads messages"  on messages for select using (true);
create policy "Auth users post"        on messages for insert  with check (auth.uid() is not null or true);
create policy "Anyone reads channels"  on channels for select using (true);

-- Enable Realtime for messages
alter publication supabase_realtime add table public.messages;

-- ================================================================
-- Trade Ideas table (run this in Supabase SQL Editor)
-- ================================================================
create table if not exists public.trade_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  username text not null,
  ticker text not null,
  side text not null check (side in ('long','short')),
  entry numeric not null,
  sl numeric not null,
  tp numeric not null,
  timeframe text not null default '1D',
  thesis text not null,
  upvotes integer default 0,
  tags text[] default '{}',
  outcome text default 'open' check (outcome in ('open','win','loss')),
  created_at timestamptz default now()
);

alter table public.trade_ideas enable row level security;
create policy "Anyone reads ideas"  on trade_ideas for select using (true);
create policy "Anyone posts ideas"  on trade_ideas for insert with check (true);
create policy "Anyone votes ideas"  on trade_ideas for update using (true);

-- ================================================================
-- Referral system + referral_code on profiles (run in Supabase)
-- ================================================================
alter table public.profiles add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users on delete cascade,
  referred_id uuid references auth.users on delete cascade,
  referred_email text,
  code text not null,
  status text default 'pending' check (status in ('pending','rewarded')),
  created_at timestamptz default now()
);

alter table public.referrals enable row level security;
create policy "Users see own referrals" on referrals for select using (auth.uid() = referrer_id);
create policy "System inserts referrals" on referrals for insert with check (true);
