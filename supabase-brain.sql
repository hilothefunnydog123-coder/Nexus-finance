-- BrainStock learning brain — a real online-trained model (single sigmoid neuron).
-- Every "Beat the AI" play logs a training example; it's labeled + trained on when
-- the 5-day window resolves. Run once in the Supabase SQL editor.

create table if not exists public.brain (
  id         int primary key default 1,
  weights    jsonb not null default '[0.4,0.6,0.3,0.5,0]'::jsonb,  -- momentum prior; SGD adjusts from here
  bias       double precision not null default 0,
  trained    int not null default 0,   -- examples learned from
  correct    int not null default 0,   -- progressive-validation hits
  updated_at timestamptz not null default now()
);
insert into public.brain (id) values (1) on conflict (id) do nothing;

create table if not exists public.brain_examples (
  id          bigserial primary key,
  ticker      text not null,
  features    jsonb not null,
  start_price numeric not null,
  resolve_date date not null,
  label       int,                     -- 1 up / 0 down, set at resolution
  status      text not null default 'open',  -- open | trained
  source      text not null default 'game',
  created_at  timestamptz not null default now()
);
create index if not exists brain_examples_open_idx on public.brain_examples (status, resolve_date);

alter table public.brain          enable row level security; -- served via service-role API
alter table public.brain_examples enable row level security;
