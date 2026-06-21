-- First-party, cookieless page analytics. Privacy-friendly: just path + referrer
-- + timestamp, no PII. Run once in the Supabase editor.

create table if not exists pageviews (
  id    bigserial primary key,
  path  text not null,
  ref   text,
  ts    timestamptz not null default now()
);
create index if not exists pageviews_ts_idx   on pageviews(ts);
create index if not exists pageviews_path_idx on pageviews(path);
alter table pageviews enable row level security; -- service-role writes only
