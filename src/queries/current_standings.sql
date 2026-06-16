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
FROM app_family_fitness_challenge__ffc_challenges c
JOIN app_family_fitness_challenge__ffc_participants p
  ON p.challenge_id = c.id
LEFT JOIN app_family_fitness_challenge__ffc_teams t
  ON t.id = p.team_id
LEFT JOIN app_family_fitness_challenge__ffc_entries e
  ON e.challenge_id = c.id
  AND e.member_id = p.member_id
WHERE CURRENT_DATE BETWEEN date(c.start_date) AND date(c.end_date)
GROUP BY c.id, c.name, c.activity_label, c.unit_label, c.mode, c.start_date, c.end_date,
         p.member_id, t.id, t.name
ORDER BY c.start_date, total DESC
LIMIT 200
