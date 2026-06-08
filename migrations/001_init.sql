-- Composite PKs include household_id so two households never collide on the
-- same generated id (defense in depth alongside the hub's RLS policies).

CREATE TABLE IF NOT EXISTS ffc_challenges (
  household_id   UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id             TEXT NOT NULL,
  name           TEXT NOT NULL,
  activity_label TEXT NOT NULL,
  unit_label     TEXT NOT NULL,
  mode           TEXT NOT NULL DEFAULT 'individual',
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  created_by     TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);

CREATE TABLE IF NOT EXISTS ffc_teams (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT,
  PRIMARY KEY (household_id, id)
);

CREATE TABLE IF NOT EXISTS ffc_participants (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  team_id      TEXT,
  joined_at    TEXT NOT NULL,
  PRIMARY KEY (household_id, id),
  UNIQUE (household_id, challenge_id, member_id)
);

-- One row per member per day per challenge — the unique key doubles as the
-- upsert target so editing a day's entry updates rather than duplicates.
CREATE TABLE IF NOT EXISTS ffc_entries (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  entry_date   TEXT NOT NULL,
  amount       REAL NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id),
  UNIQUE (household_id, challenge_id, member_id, entry_date)
);
