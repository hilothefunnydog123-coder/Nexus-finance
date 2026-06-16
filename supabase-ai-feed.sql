-- AI market-watcher feed — posts the on-site AI generates from live news.
-- Run once in the Supabase SQL editor.

create table if not exists public.ai_posts (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  hook        text not null,            -- teaser headline ("Eyeing the X IPO?")
  insight     text not null,            -- 1-2 sentence plain-English take
  ticker      text,                     -- related US ticker, if any
  forecast    jsonb,                    -- { price, target, pct, dirAcc } when ticker is forecastable
  importance  int  not null default 2,  -- 1..5
  category    text,
  source_url  text,
  emailed     boolean not null default false
);
create index if not exists ai_posts_created_idx on public.ai_posts (created_at desc);
create unique index if not exists ai_posts_source_idx on public.ai_posts (source_url) where source_url is not null;

alter table public.ai_posts enable row level security; -- served via service-role API
