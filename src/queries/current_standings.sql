SELECT
  c.id            AS challenge_id,
  c.name          AS challenge_name,
  c.activity_label,
  c.unit_label,
  c.mode,
  c.start_date,
  c.end_date,
  p.member_id,
  t.id            AS team_id,
  t.name          AS team_name,
  COALESCE(SUM(e.amount), 0) AS total
FROM ffc_challenges c
JOIN ffc_participants p
  ON p.challenge_id = c.id
  AND p.household_id = c.household_id
LEFT JOIN ffc_teams t
  ON t.id = p.team_id
  AND t.household_id = c.household_id
LEFT JOIN ffc_entries e
  ON e.challenge_id = c.id
  AND e.member_id = p.member_id
  AND e.household_id = c.household_id
WHERE c.household_id = current_setting('app.household_id', true)::uuid
  AND CURRENT_DATE BETWEEN c.start_date::date AND c.end_date::date
GROUP BY c.id, c.name, c.activity_label, c.unit_label, c.mode, c.start_date, c.end_date,
         p.member_id, t.id, t.name
ORDER BY c.start_date, total DESC
LIMIT 200
