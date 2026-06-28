-- ════════════════════════════════════════════════════════════════════════
-- The Arena — multi-model combatants.
--
-- The opponents table now stores an independent sealed prediction PER MODEL
-- (Gemini + deterministic baselines), each with its own reasoning. This adds
-- the `provider` column (e.g. 'Google', 'Baseline') so the UI can group calls
-- by who produced them. The model id/name/reasoning already live in
-- opponent_id / opponent_name / rationale.
--
-- Run once in the Supabase SQL editor (additive; safe to re-run).
-- ════════════════════════════════════════════════════════════════════════

alter table public.arena_opponent_calls
  add column if not exists provider text;

comment on column public.arena_opponent_calls.provider is
  'Who built/runs the model behind this call — e.g. Google, YN Finance, Baseline.';

comment on column public.arena_opponent_calls.rationale is
  'The model''s own plain-English reasoning for its call, shown side by side in the bout view.';
