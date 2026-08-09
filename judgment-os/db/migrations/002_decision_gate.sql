-- Decision Gate vertical slice: extend decisions table.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS uncertainty_id UUID REFERENCES uncertainties(id) ON DELETE SET NULL;

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS gate_recommendation TEXT;

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS gate_why TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS blocked_decision TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS tradeoffs JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS cost_of_waiting TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS cost_of_being_wrong TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS value_of_more_info TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS reversibility TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS would_info_change_action TEXT NOT NULL DEFAULT '';

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS ai_recommendation JSONB;

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS user_choice_note TEXT;

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS decisions_uncertainty_id_idx ON decisions(uncertainty_id);
