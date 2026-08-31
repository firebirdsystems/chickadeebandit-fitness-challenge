-- active_challenges orders by start_date under LIMIT 50, and the table had no
-- index at all. Its WHERE wraps both bounds in date(), so it cannot be sought;
-- the index is here for the ordering.
CREATE INDEX IF NOT EXISTS app_family_fitness_challenge__ffc_challenges_start_idx
  ON app_family_fitness_challenge__ffc_challenges(start_date);
