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

-- ================================================================
-- Courses Platform — run in Supabase SQL Editor
-- ================================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  trader_name text not null,
  trader_handle text,
  trader_bio text,
  trader_avatar_color text default '#00d4aa',
  strategy_type text not null,
  difficulty text default 'beginner',
  price_cents integer default 99,
  thumbnail_color text default '#00d4aa',
  trailer_youtube_id text,
  is_free boolean default false,
  is_published boolean default true,
  enrollment_count integer default 0,
  rating numeric default 4.8,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  order_index integer not null,
  title text not null,
  type text not null,
  content jsonb default '{}',
  duration_mins integer default 5,
  is_free_preview boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  progress_percent integer default 0,
  stripe_session_id text,
  unique(user_id, course_id)
);

create table if not exists public.section_completions (
  user_id uuid references auth.users on delete cascade,
  section_id uuid references course_sections(id) on delete cascade,
  completed_at timestamptz default now(),
  primary key (user_id, section_id)
);

-- RLS
alter table courses enable row level security;
alter table course_sections enable row level security;
alter table course_enrollments enable row level security;
alter table section_completions enable row level security;

create policy "Anyone reads courses" on courses for select using (is_published = true);
create policy "Anyone reads sections" on course_sections for select using (true);
create policy "Users read own enrollments" on course_enrollments for select using (auth.uid() = user_id);
create policy "Users insert enrollments" on course_enrollments for insert with check (auth.uid() = user_id);
create policy "Users update enrollments" on course_enrollments for update using (auth.uid() = user_id);
create policy "Users complete sections" on section_completions for all using (auth.uid() = user_id);

-- ================================================================
-- Course completions + certificates + creator marketplace
-- ================================================================

-- Course completions (triggers certificate generation)
create table if not exists public.course_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  course_slug text not null,
  course_title text not null,
  instructor_name text not null,
  certificate_id uuid default gen_random_uuid() unique,
  completed_at timestamptz default now(),
  unique(user_id, course_slug)
);
alter table course_completions enable row level security;
create policy "Users see own completions" on course_completions for select using (auth.uid() = user_id);
create policy "Users insert own completions" on course_completions for insert with check (auth.uid() = user_id);

-- Creator profiles
create table if not exists public.creator_profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  handle text unique not null,
  bio text,
  avatar_color text default '#00d4aa',
  strategy_specialty text,
  youtube_url text,
  twitter_url text,
  commission_rate numeric default 0.70,
  total_earnings numeric default 0,
  payout_email text,
  approved boolean default false,
  created_at timestamptz default now()
);
alter table creator_profiles enable row level security;
create policy "Anyone reads approved creators" on creator_profiles for select using (approved = true);
create policy "Creator manages own profile" on creator_profiles for all using (auth.uid() = id);

-- Creator-submitted courses
create table if not exists public.submitted_courses (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users on delete cascade not null,
  creator_name text not null,
  title text not null,
  description text,
  strategy_type text not null,
  difficulty text default 'beginner',
  price_cents integer default 99,
  sections jsonb default '[]',
  tags text[] default '{}',
  thumbnail_color text default '#00d4aa',
  status text default 'draft',
  total_sales integer default 0,
  total_earnings numeric default 0,
  created_at timestamptz default now(),
  published_at timestamptz
);
alter table submitted_courses enable row level security;
create policy "Anyone reads published courses" on submitted_courses for select using (status = 'published');
create policy "Creators manage own courses" on submitted_courses for all using (auth.uid() = creator_id);

-- Commission tracking
create table if not exists public.course_sales (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null,
  buyer_id uuid references auth.users,
  creator_id uuid references auth.users,
  amount_cents integer not null,
  creator_commission_cents integer not null,
  stripe_session_id text,
  created_at timestamptz default now()
);
alter table course_sales enable row level security;
create policy "Creators see own sales" on course_sales for select using (auth.uid() = creator_id);
