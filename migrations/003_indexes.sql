-- The app shipped with no indexes at all. `ffc_entries` is read per challenge
-- and its max_per_member uniqueness check scopes on (challenge_id, entry_date)
-- — a full table scan on every logged entry until now. entry_date also backs
-- the retention sweep.
CREATE INDEX IF NOT EXISTS app_family_fitness_challenge__ffc_entries_challenge_idx
  ON app_family_fitness_challenge__ffc_entries (challenge_id, entry_date);
CREATE INDEX IF NOT EXISTS app_family_fitness_challenge__ffc_entries_retention_idx
  ON app_family_fitness_challenge__ffc_entries (entry_date);
CREATE INDEX IF NOT EXISTS app_family_fitness_challenge__ffc_participants_challenge_idx
  ON app_family_fitness_challenge__ffc_participants (challenge_id);
CREATE INDEX IF NOT EXISTS app_family_fitness_challenge__ffc_teams_challenge_idx
  ON app_family_fitness_challenge__ffc_teams (challenge_id);
