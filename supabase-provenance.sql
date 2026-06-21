-- Provenance receipts for forecast calls.
-- Adds a tamper-evident hash + HMAC signature to each logged call so the
-- prediction can later be proven un-edited. Run once in the Supabase SQL editor.
-- Set PROVENANCE_SECRET in the environment to enable signatures (hash works
-- without it, but only the HMAC makes the receipt un-forgeable).

alter table public.forecast_calls
  add column if not exists proof_hash text,
  add column if not exists proof_sig  text,
  add column if not exists proof_alg  text;

create index if not exists forecast_calls_proof_hash_idx
  on public.forecast_calls (proof_hash);

comment on column public.forecast_calls.proof_hash is
  'SHA-256 of canonical immutable prediction fields (trade_date|ticker|start_price|target|pct|horizon|resolve_date).';
comment on column public.forecast_calls.proof_sig is
  'HMAC-SHA256 of proof_hash with PROVENANCE_SECRET. Proves the receipt is ours.';
comment on column public.forecast_calls.proof_alg is
  'Hash algorithm used (sha256).';
