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
FROM ffc_challenges
WHERE household_id = current_setting('app.household_id', true)::uuid
  AND CURRENT_DATE BETWEEN start_date::date AND end_date::date
ORDER BY start_date
LIMIT 50
