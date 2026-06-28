/**
 * Pure business logic for the Family Fitness Challenge app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export { AVATAR_COLORS, memberColor, initial, esc, isAdult } from "./shared.js";

// ── Quick-pick presets for the "new challenge" form ────────────────────────────
// Organizers can also type a fully custom activity label + unit.
export const UNIT_PRESETS = [
  { label: "Steps",          activityLabel: "Steps",          unitLabel: "steps" },
  { label: "Distance (mi)",  activityLabel: "Distance",       unitLabel: "mi" },
  { label: "Distance (km)",  activityLabel: "Distance",       unitLabel: "km" },
  { label: "Active Minutes", activityLabel: "Active Minutes", unitLabel: "min" },
  { label: "Workouts",       activityLabel: "Workouts",       unitLabel: "workouts" },
];

// ── Badge catalog ───────────────────────────────────────────────────────────────
export const BADGES = {
  first_entry:        { icon: "🎯", label: "First Entry",   description: "Logged your first activity in a challenge" },
  streak_3:           { icon: "🔥", label: "3-Day Streak",  description: "Logged activity 3 days in a row" },
  streak_7:           { icon: "🔥", label: "7-Day Streak",  description: "Logged activity 7 days in a row" },
  personal_best:      { icon: "⭐", label: "Personal Best", description: "Hit your best single-day total in a challenge" },
  challenge_champion: { icon: "🏆", label: "Champion",      description: "Finished #1 in a completed challenge" },
};

// ── Date helpers (plain "YYYY-MM-DD" strings — matches <input type="date">) ────

/** Format a JS Date as a local "YYYY-MM-DD" string. */
export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add (or subtract) whole days from a "YYYY-MM-DD" string, returning a new one. */
export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Inclusive day count between two "YYYY-MM-DD" strings (start and end both count). */
export function daysBetween(startISO, endISO) {
  const [y1, m1, d1] = startISO.split("-").map(Number);
  const [y2, m2, d2] = endISO.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** "upcoming" | "active" | "completed" based on today vs. the challenge's date range. */
export function challengeStatus(challenge, todayISO = toISODate()) {
  const today = dateOnly(todayISO);
  const start = dateOnly(challenge.start_date);
  const end = dateOnly(challenge.end_date);
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "active";
}

/** Normalize a date or datetime string to the plain date used for comparisons. */
export function dateOnly(value) {
  return String(value ?? "").slice(0, 10);
}

/** Rank label for a zero-based index: medals for top 3, numbers after. */
export function rankLabel(index) {
  return ["🥇", "🥈", "🥉"][index] ?? String(index + 1);
}

// ── Standings ───────────────────────────────────────────────────────────────────

/**
 * Aggregate total logged amount per member (individual mode) or per team (team
 * mode), ranked descending by total. Scoring is total-accumulated — sum of all
 * entries over the challenge period.
 *
 * entries:      Array<{ member_id, amount }>
 * participants: Array<{ member_id, team_id }>
 * teams:        Array<{ id, name, color }>
 * mode:         "individual" | "team"
 *
 * Returns ranked Array<{ id, kind: "member"|"team", total, memberIds }>.
 * Callers attach display info (names, colors) via their member/team lookups.
 */
export function computeStandings(entries, participants, teams, mode) {
  const totalByMember = new Map();
  for (const e of entries) {
    totalByMember.set(e.member_id, (totalByMember.get(e.member_id) ?? 0) + e.amount);
  }

  if (mode === "team") {
    return teams
      .map(team => {
        const memberIds = participants.filter(p => p.team_id === team.id).map(p => p.member_id);
        const total = memberIds.reduce((sum, id) => sum + (totalByMember.get(id) ?? 0), 0);
        return { id: team.id, kind: "team", total, memberIds };
      })
      .sort((a, b) => b.total - a.total);
  }

  return participants
    .map(p => ({ id: p.member_id, kind: "member", total: totalByMember.get(p.member_id) ?? 0, memberIds: [p.member_id] }))
    .sort((a, b) => b.total - a.total);
}

// ── Streaks (lightweight, in-challenge only — see Streaks app for habit tracking) ─

/**
 * Number of consecutive days, ending at `asOfISO` (inclusive), on which the
 * member logged at least one entry in this challenge.
 *
 * entries: Array<{ member_id, entry_date }> — entry_date as "YYYY-MM-DD"
 */
export function currentStreak(entries, memberId, asOfISO = toISODate()) {
  const dates = new Set(entries.filter(e => e.member_id === memberId).map(e => e.entry_date));
  let streak = 0;
  let cursor = asOfISO;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ── Badges ──────────────────────────────────────────────────────────────────────

/**
 * Badge ids a member has earned within one challenge. Computed on the fly from
 * raw entries + standings — nothing is persisted, so there's no sync surface.
 *
 * member:    { id, ... }
 * challenge: { start_date, end_date, ... }
 * entries:   Array<{ member_id, entry_date, amount }> for this challenge
 * standings: ranked Array from computeStandings (used to detect the champion)
 * todayISO:  "YYYY-MM-DD", defaults to today
 */
export function computeBadges(member, challenge, entries, standings, todayISO = toISODate()) {
  const memberEntries = entries.filter(e => e.member_id === member.id);
  if (!memberEntries.length) return [];

  const badges = ["first_entry"];

  const streak = currentStreak(entries, member.id, todayISO);
  if (streak >= 7) badges.push("streak_7");
  else if (streak >= 3) badges.push("streak_3");

  if (memberEntries.length > 1) {
    const best = Math.max(...memberEntries.map(e => e.amount));
    const today = memberEntries.find(e => e.entry_date === todayISO);
    if (today && today.amount === best) badges.push("personal_best");
  }

  if (challengeStatus(challenge, todayISO) === "completed") {
    const top = standings[0];
    if (top && top.memberIds.includes(member.id)) badges.push("challenge_champion");
  }

  return badges;
}
