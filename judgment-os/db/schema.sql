-- JudgmentOS MVP schema v0.1
-- PostgreSQL / Supabase compatible
-- No AI tables yet — structure only

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE project_status AS ENUM (
  'ACTIVE',
  'PAUSED',
  'ARCHIVED'
);

CREATE TYPE uncertainty_status AS ENUM (
  'OPEN',
  'REDUCED',
  'RESOLVED',
  'ARCHIVED'
);

CREATE TYPE milestone_status AS ENUM (
  'PROPOSED',
  'RESEARCHING',
  'READY_TO_DECIDE',
  'DECIDED',
  'ACTION_RUNNING',
  'FEEDBACK_REQUIRED',
  'LEARNING_CAPTURED',
  'ARCHIVED'
);

CREATE TYPE evidence_type AS ENUM (
  'FACT',
  'ASSUMPTION',
  'INFERENCE',
  'OPINION'
);

CREATE TYPE evidence_user_status AS ENUM (
  'UNREVIEWED',
  'ACCEPTED',
  'CHALLENGED',
  'CORRECTED'
);

CREATE TYPE decision_status AS ENUM (
  'OPEN',
  'PROVISIONAL',
  'FROZEN',
  'REOPENED'
);

-- ---------------------------------------------------------------------------
-- Project
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  goal                  TEXT NOT NULL DEFAULT '',
  success_criteria      TEXT NOT NULL DEFAULT '',
  constraints           TEXT NOT NULL DEFAULT '',
  user_deadline         TIMESTAMPTZ,
  recommended_deadline  TIMESTAMPTZ,
  status                project_status NOT NULL DEFAULT 'ACTIVE',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Uncertainty
-- ---------------------------------------------------------------------------

CREATE TABLE uncertainties (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question            TEXT NOT NULL,
  importance          INTEGER NOT NULL DEFAULT 0 CHECK (importance BETWEEN 0 AND 100),
  current_confidence  INTEGER NOT NULL DEFAULT 0 CHECK (current_confidence BETWEEN 0 AND 100),
  status              uncertainty_status NOT NULL DEFAULT 'OPEN',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX uncertainties_project_id_idx ON uncertainties(project_id);

-- ---------------------------------------------------------------------------
-- Milestone
-- Endpoint is LEARNING_CAPTURED — there is no DONE.
-- ---------------------------------------------------------------------------

CREATE TABLE milestones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uncertainty_id      UUID REFERENCES uncertainties(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  purpose             TEXT NOT NULL DEFAULT '',
  expected_learning   TEXT NOT NULL DEFAULT '',
  status              milestone_status NOT NULL DEFAULT 'PROPOSED',
  deadline            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX milestones_project_id_idx ON milestones(project_id);
CREATE INDEX milestones_uncertainty_id_idx ON milestones(uncertainty_id);

-- ---------------------------------------------------------------------------
-- Evidence
-- Source ≠ Fact. Claims are classified and user-reviewed.
-- ---------------------------------------------------------------------------

CREATE TABLE evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id  UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  claim         TEXT NOT NULL,
  type          evidence_type NOT NULL,
  source        TEXT,
  confidence    INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  user_status   evidence_user_status NOT NULL DEFAULT 'UNREVIEWED',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX evidence_milestone_id_idx ON evidence(milestone_id);

-- ---------------------------------------------------------------------------
-- Decision
-- Preserve reasoning, not just selected_option.
-- ---------------------------------------------------------------------------

CREATE TABLE decisions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id        UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  question            TEXT NOT NULL,
  options             JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_option     JSONB,
  reasoning           TEXT NOT NULL DEFAULT '',
  confidence          INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  status              decision_status NOT NULL DEFAULT 'OPEN',
  -- Snapshot at decision time (Judgment Database foundation)
  evidence_at_time    JSONB NOT NULL DEFAULT '[]'::jsonb,
  unknowns_at_time    JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_at_time  INTEGER,
  deadline_at_time    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX decisions_project_id_idx ON decisions(project_id);
CREATE INDEX decisions_milestone_id_idx ON decisions(milestone_id);

-- ---------------------------------------------------------------------------
-- Feedback
-- Closes Decision → Reality.
-- ---------------------------------------------------------------------------

CREATE TABLE feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id        UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  decision_id         UUID REFERENCES decisions(id) ON DELETE SET NULL,
  expected_outcome    TEXT NOT NULL DEFAULT '',
  actual_outcome      TEXT NOT NULL DEFAULT '',
  learning            TEXT NOT NULL DEFAULT '',
  confidence_before   INTEGER CHECK (confidence_before BETWEEN 0 AND 100),
  confidence_after    INTEGER CHECK (confidence_after BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX feedback_milestone_id_idx ON feedback(milestone_id);
CREATE INDEX feedback_decision_id_idx ON feedback(decision_id);

-- ---------------------------------------------------------------------------
-- Belief updates (Evidence → Belief Update)
-- AI proposes; human accepts / challenges / corrects.
-- Cumulative on uncertainty via history of rows.
-- ---------------------------------------------------------------------------

CREATE TYPE belief_support AS ENUM (
  'SUPPORTS',
  'CHALLENGES',
  'MIXED',
  'NEUTRAL'
);

CREATE TYPE belief_review_status AS ENUM (
  'UNREVIEWED',
  'ACCEPTED',
  'CHALLENGED',
  'CORRECTED'
);

CREATE TABLE belief_updates (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id                  UUID NOT NULL UNIQUE REFERENCES evidence(id) ON DELETE CASCADE,
  uncertainty_id               UUID NOT NULL REFERENCES uncertainties(id) ON DELETE CASCADE,
  milestone_id                 UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  evidence_type                evidence_type NOT NULL,
  evidence_strength            INTEGER NOT NULL DEFAULT 0 CHECK (evidence_strength BETWEEN 0 AND 100),
  supports_or_challenges       belief_support NOT NULL,
  belief_update                TEXT NOT NULL DEFAULT '',
  remaining_unknowns           JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_next_experiment  TEXT NOT NULL DEFAULT '',
  prior_confidence             INTEGER NOT NULL DEFAULT 0 CHECK (prior_confidence BETWEEN 0 AND 100),
  suggested_confidence         INTEGER NOT NULL DEFAULT 0 CHECK (suggested_confidence BETWEEN 0 AND 100),
  user_review_status           belief_review_status NOT NULL DEFAULT 'UNREVIEWED',
  user_correction              TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX belief_updates_uncertainty_id_idx ON belief_updates(uncertainty_id);
CREATE INDEX belief_updates_milestone_id_idx ON belief_updates(milestone_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER uncertainties_set_updated_at
  BEFORE UPDATE ON uncertainties
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER milestones_set_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER evidence_set_updated_at
  BEFORE UPDATE ON evidence
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER decisions_set_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER belief_updates_set_updated_at
  BEFORE UPDATE ON belief_updates
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
