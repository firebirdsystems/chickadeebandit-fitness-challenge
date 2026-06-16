-- Composite PKs include household_id so two households never collide on the
-- same generated id (defense in depth alongside the hub's RLS policies).

CREATE TABLE IF NOT EXISTS app_family_fitness_challenge__ffc_challenges (
  id             TEXT NOT NULL,
  name           TEXT NOT NULL,
  activity_label TEXT NOT NULL,
  unit_label     TEXT NOT NULL,
  mode           TEXT NOT NULL DEFAULT 'individual',
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  created_by     TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_family_fitness_challenge__ffc_teams (
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_family_fitness_challenge__ffc_participants (
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  team_id      TEXT,
  joined_at    TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (challenge_id, member_id)
);

-- One row per member per day per challenge — the unique key doubles as the
-- upsert target so editing a day's entry updates rather than duplicates.
CREATE TABLE IF NOT EXISTS app_family_fitness_challenge__ffc_entries (
  id           TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  entry_date   TEXT NOT NULL,
  amount       REAL NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (challenge_id, member_id, entry_date)
);
