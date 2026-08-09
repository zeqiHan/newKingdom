-- v0.2: plan proposals for Dynamic Replanning
CREATE TABLE IF NOT EXISTS plan_proposals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id        UUID REFERENCES milestones(id) ON DELETE SET NULL,
  trigger_kind        TEXT NOT NULL DEFAULT 'MANUAL',
  what_changed        TEXT NOT NULL DEFAULT '',
  why_not_optimal     TEXT NOT NULL DEFAULT '',
  proposed_changes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_benefit    TEXT NOT NULL DEFAULT '',
  tradeoff_risk       TEXT NOT NULL DEFAULT '',
  new_unknown         TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'PENDING',
  user_note           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_proposals_project_id_idx ON plan_proposals(project_id);
CREATE INDEX IF NOT EXISTS plan_proposals_status_idx ON plan_proposals(status);

DO $$ BEGIN
  CREATE TRIGGER plan_proposals_set_updated_at
    BEFORE UPDATE ON plan_proposals
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
