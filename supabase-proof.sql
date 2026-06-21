-- Proof — the net's learning history (one snapshot per training run) so we can
-- plot the loss curve trending down over time. Run once in the Supabase editor.

create table if not exists nn_history (
  id        bigserial primary key,
  ts        timestamptz not null default now(),
  trained   bigint not null default 0,
  avg_loss  double precision default 0,
  dir_acc   double precision default 0
);
create index if not exists nn_history_ts_idx on nn_history (ts);
alter table nn_history enable row level security; -- service-role only
