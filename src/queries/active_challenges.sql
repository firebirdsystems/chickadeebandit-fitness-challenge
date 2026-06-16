SELECT
  id,
  name,
  activity_label,
  unit_label,
  mode,
  start_date,
  end_date,
  created_by,
  created_at
FROM app_family_fitness_challenge__ffc_challenges
WHERE CURRENT_DATE BETWEEN date(start_date) AND date(end_date)
ORDER BY start_date
LIMIT 50
