-- Add sacrifice tracking to projects and experiments
-- Migration: Add Sacrifice Declaration feature

-- Add sacrifice category enum
CREATE TYPE sacrifice_category AS ENUM (
  'TIME',
  'QUALITY',
  'SCOPE',
  'RESOURCE',
  'RISK',
  'OTHER'
);

-- Add willing_sacrifices to projects
-- These are the sacrifices user is willing to make at project start
ALTER TABLE projects ADD COLUMN willing_sacrifices JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN sacrifices_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.willing_sacrifices IS 
'Array of sacrifice declarations: [{id, category, description, impact, aiGenerated, userModified, acceptedAt}]';

-- Add required_sacrifices to experiments
-- These are the sacrifices this specific action will require
ALTER TABLE experiments ADD COLUMN required_sacrifices JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE experiments ADD COLUMN sacrifices_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN experiments.required_sacrifices IS 
'Array of sacrifices needed for this action: [{id, category, description, impact, aiGenerated, userModified, acceptedAt}]';

-- Add sacrifice-related judgment events
-- This allows tracking when users modify or accept sacrifices
INSERT INTO judgment_events (project_id, event_type, payload, created_at)
SELECT id, 'SACRIFICE_SYSTEM_ENABLED', '{}'::jsonb, now()
FROM projects
WHERE willing_sacrifices IS NOT NULL;
