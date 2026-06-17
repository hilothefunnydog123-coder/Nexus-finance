-- Humans vs BrainStock — the global war scoreboard.
-- Adds the human's guess + the AI's guess to each Beat-the-AI play so we can tally
-- the whole planet's record against the machine. Run once in the Supabase SQL editor.

alter table public.brain_examples add column if not exists user_dir text;  -- 'up' | 'down' (human's call)
alter table public.brain_examples add column if not exists ai_dir   text;  -- 'up' | 'down' (AI's call at play time)

-- Fast aggregation of resolved games that have a recorded human guess.
create index if not exists brain_examples_showdown_idx
  on public.brain_examples (status, label)
  where user_dir is not null;
