-- ============================================================
-- Migration 003: Police app schema
-- Project: izxsbtpepvjcmwjagvgz (AI-solutions-tracker)
-- Run via: Supabase dashboard → SQL Editor, or supabase db push
-- ============================================================

-- Organisations (one row per client deployment)
CREATE TABLE IF NOT EXISTS organisations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  modules          jsonb NOT NULL DEFAULT '{"voiceCapture":true,"approvalFlow":true,"dataStorage":true,"orgManagement":true}'::jsonb,
  user_id_label    text NOT NULL DEFAULT 'Badge Number',
  transcript_label text NOT NULL DEFAULT 'Incident Report',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own org (matched via user metadata orgSlug)
CREATE POLICY "Users read own org" ON organisations
  FOR SELECT USING (true);  -- public read; orgs contain no sensitive data

-- Roles per organisation
CREATE TABLE IF NOT EXISTS roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  level         integer NOT NULL DEFAULT 1,
  is_supervisor boolean NOT NULL DEFAULT false,
  is_admin      boolean NOT NULL DEFAULT false
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles" ON roles
  FOR SELECT USING (true);  -- needed for registration role datalist

-- ── Seed: Barbados Police Force ──────────────────────────────
INSERT INTO organisations (name, slug, modules, user_id_label, transcript_label)
VALUES (
  'Barbados Police Force',
  'barbados-police',
  '{"voiceCapture":true,"approvalFlow":true,"dataStorage":true,"orgManagement":true}'::jsonb,
  'Badge Number',
  'Incident Report'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO roles (org_id, name, level, is_supervisor, is_admin)
SELECT o.id, r.name, r.level, r.is_supervisor, r.is_admin
FROM organisations o,
  (VALUES
    ('Field Officer',   1, false, false),
    ('Office Officer',  2, false, false),
    ('Detective',       3, false, false),
    ('Sergeant',        4, false, false),
    ('Inspector',       5, true,  false),
    ('Supervisor',      6, true,  false),
    ('Administrator',   7, true,  true)
  ) AS r(name, level, is_supervisor, is_admin)
WHERE o.slug = 'barbados-police'
ON CONFLICT DO NOTHING;
