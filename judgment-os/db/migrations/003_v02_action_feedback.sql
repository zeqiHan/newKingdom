-- v0.2: Action/Experiment, richer Feedback, Judgment Event History
-- Safe to re-run (IF NOT EXISTS).

-- ---------------------------------------------------------------------------
-- Experiments (Decision → Action / Experiment)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS experiments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id        UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  decision_id         UUID REFERENCES decisions(id) ON DELETE SET NULL,
  action_text         TEXT NOT NULL DEFAULT '',
  hypothesis          TEXT NOT NULL DEFAULT '',
  expected_outcome    TEXT NOT NULL DEFAULT '',
  evidence_expected   TEXT NOT NULL DEFAULT '',
  deadline            TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'PLANNED',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS experiments_milestone_id_idx ON experiments(milestone_id);
CREATE INDEX IF NOT EXISTS experiments_decision_id_idx ON experiments(decision_id);

DO $$ BEGIN
  CREATE TRIGGER experiments_set_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Feedback extensions (Expected / Actual / Difference / Learning)
-- ---------------------------------------------------------------------------

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS difference TEXT NOT NULL DEFAULT '';

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS assumptions_strengthened JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS assumptions_weakened JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS uncertainties_reduced JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS new_uncertainties JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS decision_impact TEXT NOT NULL DEFAULT 'NEUTRAL';

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS suggest_reopen BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS feedback_experiment_id_idx ON feedback(experiment_id);

-- ---------------------------------------------------------------------------
-- Immutable judgment event history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS judgment_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id     UUID REFERENCES milestones(id) ON DELETE SET NULL,
  decision_id      UUID REFERENCES decisions(id) ON DELETE SET NULL,
  uncertainty_id   UUID REFERENCES uncertainties(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS judgment_events_project_id_idx ON judgment_events(project_id);
CREATE INDEX IF NOT EXISTS judgment_events_milestone_id_idx ON judgment_events(milestone_id);
CREATE INDEX IF NOT EXISTS judgment_events_created_at_idx ON judgment_events(created_at);
