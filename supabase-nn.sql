-- BrainStock's real neural network — persisted weights + training labels.
-- The net (lib/nn.ts) is an MLP trained with backprop/Adam on graded outcomes.
-- Run once in the Supabase SQL editor.

create table if not exists nn_model (
  id          int primary key default 1,
  model       jsonb not null,                 -- full serialized network (weights + Adam state)
  arch        text,                            -- e.g. "11→16→12→1"
  trained     bigint not null default 0,       -- training examples seen
  avg_loss    double precision default 0,
  dir_acc     double precision default 0,      -- training directional accuracy
  updated_at  timestamptz not null default now()
);

-- The flywheel needs the input features + a "trained on yet?" flag.
alter table prediction_log add column if not exists features    jsonb;
alter table prediction_log add column if not exists nn_trained  boolean not null default false;

create index if not exists prediction_log_train_idx
  on prediction_log (status, nn_trained)
  where features is not null;

alter table nn_model enable row level security; -- service-role only
