-- Single-user tracker: one settings row, plan groups (weeks / steps / sub-steps / languages) and items.

CREATE TABLE settings (
  id               smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  roadmap_start    date     NOT NULL DEFAULT '2026-10-26',
  striver_start    date     NOT NULL DEFAULT '2026-10-26',
  striver_weeks    smallint NOT NULL DEFAULT 16 CHECK (striver_weeks BETWEEN 1 AND 52),
  theme            text     NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  link_duplicates  boolean  NOT NULL DEFAULT true,
  hide_completed   boolean  NOT NULL DEFAULT false,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1);

CREATE TABLE plan_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  text NOT NULL CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision')),
  parent_id   uuid REFERENCES plan_groups (id) ON DELETE CASCADE,  -- Striver sub-step → step
  title       text NOT NULL DEFAULT '',
  week        smallint,                                            -- plan week / scheduled Striver week
  focus       text NOT NULL DEFAULT '',
  step        smallint,                                            -- Striver step number 1–18
  role        text CHECK (role IN ('tips')),                       -- 'tips' = DSA “How to practise” box
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_groups_section_parent_idx ON plan_groups (section_id, parent_id, position);

CREATE TABLE plan_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id     text NOT NULL CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision')),
  group_id       uuid NOT NULL REFERENCES plan_groups (id) ON DELETE CASCADE,
  title          text NOT NULL CHECK (length(btrim(title)) > 0),
  kind           text NOT NULL CHECK (kind IN ('task', 'concept', 'problem', 'topic')),
  track          text NOT NULL DEFAULT '' CHECK (track IN ('', 'DSA', 'System design', 'Deep dive', 'Behavioral', 'Applications', 'Checkpoint')),
  level          text NOT NULL DEFAULT '' CHECK (level IN ('', 'Basic', 'Intermediate', 'Advanced')),
  difficulty     text NOT NULL DEFAULT '' CHECK (difficulty IN ('', 'Easy', 'Medium', 'Hard')),
  notes          text NOT NULL DEFAULT '',
  link           text NOT NULL DEFAULT '',
  done           boolean NOT NULL DEFAULT false,
  done_at        timestamptz,
  revisit_dates  date[] NOT NULL DEFAULT '{}',
  key            text NOT NULL DEFAULT '',                         -- normalised problem title, see domain/problem-key.js
  position       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT done_at_matches_done CHECK (done = (done_at IS NOT NULL))
);
CREATE INDEX plan_items_group_position_idx ON plan_items (group_id, position);
CREATE INDEX plan_items_problem_key_idx ON plan_items (key) WHERE kind = 'problem' AND key <> '';
CREATE INDEX plan_items_done_at_idx ON plan_items (done_at) WHERE done;
