import { describe, it, expect } from "vitest";
import {
  toISODate,
  addDays,
  daysBetween,
  dateOnly,
  challengeStatus,
  rankLabel,
  computeStandings,
  currentStreak,
  computeBadges,
  BADGES, searchableFields,
  challengeCreateStatements, MAX_PARTICIPANTS,
} from "../src/logic.js";

// ── date helpers ────────────────────────────────────────────────────────────────

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD with zero-padding", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISODate(new Date(2026, 10, 23))).toBe("2026-11-23");
  });
});

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-06-01", 4)).toBe("2026-06-05");
  });
  it("subtracts days across a month boundary", () => {
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
  });
  it("handles year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });
});

describe("daysBetween", () => {
  it("counts a single day as 1 (inclusive)", () => {
    expect(daysBetween("2026-06-01", "2026-06-01")).toBe(1);
  });
  it("counts a week-long range as 7", () => {
    expect(daysBetween("2026-06-01", "2026-06-07")).toBe(7);
  });
  it("counts across a month boundary", () => {
    expect(daysBetween("2026-05-30", "2026-06-02")).toBe(4);
  });
});

describe("challengeStatus", () => {
  const challenge = { start_date: "2026-06-01", end_date: "2026-06-30" };
  it("is upcoming before the start date", () => {
    expect(challengeStatus(challenge, "2026-05-31")).toBe("upcoming");
  });
  it("is active on the start date", () => {
    expect(challengeStatus(challenge, "2026-06-01")).toBe("active");
  });
  it("is active in the middle of the range", () => {
    expect(challengeStatus(challenge, "2026-06-15")).toBe("active");
  });
  it("is active on the end date", () => {
    expect(challengeStatus(challenge, "2026-06-30")).toBe("active");
  });
  it("is completed after the end date", () => {
    expect(challengeStatus(challenge, "2026-07-01")).toBe("completed");
  });

  it("normalizes datetime strings before comparing", () => {
    const datetimeChallenge = { start_date: "2026-06-01T00:00:00.000Z", end_date: "2026-06-30T23:59:59.999Z" };
    expect(challengeStatus(datetimeChallenge, "2026-06-30")).toBe("active");
  });
});

describe("dateOnly", () => {
  it("returns the YYYY-MM-DD portion of date-like strings", () => {
    expect(dateOnly("2026-06-30T23:59:59.999Z")).toBe("2026-06-30");
    expect(dateOnly("2026-06-30")).toBe("2026-06-30");
  });
});

describe("rankLabel", () => {
  it("returns medals for the top 3", () => {
    expect(rankLabel(0)).toBe("🥇");
    expect(rankLabel(1)).toBe("🥈");
    expect(rankLabel(2)).toBe("🥉");
  });
  it("returns a 1-based number for ranks beyond 3", () => {
    expect(rankLabel(3)).toBe("4");
    expect(rankLabel(9)).toBe("10");
  });
});

// ── computeStandings ────────────────────────────────────────────────────────────

describe("computeStandings — individual mode", () => {
  const participants = [
    { member_id: "alex", team_id: null },
    { member_id: "sam", team_id: null },
    { member_id: "jordan", team_id: null },
  ];
  const entries = [
    { member_id: "alex", amount: 5000 },
    { member_id: "alex", amount: 3000 },
    { member_id: "sam", amount: 12000 },
    { member_id: "jordan", amount: 0 },
  ];

  it("sums each member's entries and ranks descending by total", () => {
    const standings = computeStandings(entries, participants, [], "individual");
    expect(standings.map(s => s.id)).toEqual(["sam", "alex", "jordan"]);
    expect(standings[0]).toMatchObject({ id: "sam", kind: "member", total: 12000, memberIds: ["sam"] });
    expect(standings[1].total).toBe(8000);
  });

  it("gives participants with no entries a total of zero", () => {
    const standings = computeStandings([], participants, [], "individual");
    expect(standings.every(s => s.total === 0)).toBe(true);
  });
});

describe("computeStandings — team mode", () => {
  const teams = [
    { id: "team-a", name: "Sharks", color: "#0284c7" },
    { id: "team-b", name: "Eagles", color: "#db2777" },
  ];
  const participants = [
    { member_id: "alex", team_id: "team-a" },
    { member_id: "sam", team_id: "team-a" },
    { member_id: "jordan", team_id: "team-b" },
  ];
  const entries = [
    { member_id: "alex", amount: 4000 },
    { member_id: "sam", amount: 4000 },
    { member_id: "jordan", amount: 9000 },
  ];

  it("aggregates member totals up to their team and ranks teams", () => {
    const standings = computeStandings(entries, participants, teams, "team");
    expect(standings[0]).toMatchObject({ id: "team-b", kind: "team", total: 9000, memberIds: ["jordan"] });
    expect(standings[1]).toMatchObject({ id: "team-a", total: 8000 });
    expect(standings[1].memberIds.sort()).toEqual(["alex", "sam"]);
  });
});

// ── currentStreak ────────────────────────────────────────────────────────────────

describe("currentStreak", () => {
  const memberId = "alex";

  it("returns 0 when the member has no entry today", () => {
    const entries = [{ member_id: memberId, entry_date: "2026-06-01" }];
    expect(currentStreak(entries, memberId, "2026-06-03")).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const entries = [
      { member_id: memberId, entry_date: "2026-06-01" },
      { member_id: memberId, entry_date: "2026-06-02" },
      { member_id: memberId, entry_date: "2026-06-03" },
    ];
    expect(currentStreak(entries, memberId, "2026-06-03")).toBe(3);
  });

  it("stops counting at a gap", () => {
    const entries = [
      { member_id: memberId, entry_date: "2026-06-01" },
      { member_id: memberId, entry_date: "2026-06-03" },
    ];
    expect(currentStreak(entries, memberId, "2026-06-03")).toBe(1);
  });

  it("ignores other members' entries", () => {
    const entries = [
      { member_id: "sam", entry_date: "2026-06-03" },
      { member_id: memberId, entry_date: "2026-06-02" },
    ];
    expect(currentStreak(entries, memberId, "2026-06-03")).toBe(0);
  });
});

// ── computeBadges ────────────────────────────────────────────────────────────────

describe("computeBadges", () => {
  const member = { id: "alex", name: "Alex" };
  const challenge = { start_date: "2026-06-01", end_date: "2026-06-30" };

  it("awards nothing for a member with no entries", () => {
    expect(computeBadges(member, challenge, [], [], "2026-06-05")).toEqual([]);
  });

  it("awards first_entry for a single logged day", () => {
    const entries = [{ member_id: "alex", entry_date: "2026-06-05", amount: 5000 }];
    expect(computeBadges(member, challenge, entries, [], "2026-06-05")).toContain("first_entry");
  });

  it("awards streak_3 at a 3-day streak and streak_7 at a 7-day streak", () => {
    const threeDay = ["2026-06-03", "2026-06-04", "2026-06-05"]
      .map(d => ({ member_id: "alex", entry_date: d, amount: 1000 }));
    const badges3 = computeBadges(member, challenge, threeDay, [], "2026-06-05");
    expect(badges3).toContain("streak_3");
    expect(badges3).not.toContain("streak_7");

    const sevenDay = Array.from({ length: 7 }, (_, i) =>
      ({ member_id: "alex", entry_date: addDaysForTest("2026-06-01", i), amount: 1000 }));
    const badges7 = computeBadges(member, challenge, sevenDay, [], "2026-06-07");
    expect(badges7).toContain("streak_7");
    expect(badges7).not.toContain("streak_3");
  });

  it("awards personal_best when today's entry matches the member's best", () => {
    const entries = [
      { member_id: "alex", entry_date: "2026-06-04", amount: 5000 },
      { member_id: "alex", entry_date: "2026-06-05", amount: 9000 },
    ];
    expect(computeBadges(member, challenge, entries, [], "2026-06-05")).toContain("personal_best");
  });

  it("does not award personal_best when today is not the best day", () => {
    const entries = [
      { member_id: "alex", entry_date: "2026-06-04", amount: 9000 },
      { member_id: "alex", entry_date: "2026-06-05", amount: 5000 },
    ];
    expect(computeBadges(member, challenge, entries, [], "2026-06-05")).not.toContain("personal_best");
  });

  it("awards challenge_champion only once the challenge is completed and the member is ranked first", () => {
    const entries = [{ member_id: "alex", entry_date: "2026-06-05", amount: 5000 }];
    const standings = [{ id: "alex", kind: "member", total: 5000, memberIds: ["alex"] }];

    expect(computeBadges(member, challenge, entries, standings, "2026-06-05")).not.toContain("challenge_champion");
    expect(computeBadges(member, challenge, entries, standings, "2026-07-01")).toContain("challenge_champion");
  });

  it("does not award challenge_champion to a member who didn't finish first", () => {
    const entries = [{ member_id: "alex", entry_date: "2026-06-05", amount: 1000 }];
    const standings = [
      { id: "sam", kind: "member", total: 9000, memberIds: ["sam"] },
      { id: "alex", kind: "member", total: 1000, memberIds: ["alex"] },
    ];
    expect(computeBadges(member, challenge, entries, standings, "2026-07-01")).not.toContain("challenge_champion");
  });
});

describe("BADGES catalog", () => {
  it("has display info for every badge id referenced by computeBadges", () => {
    for (const id of ["first_entry", "streak_3", "streak_7", "personal_best", "challenge_champion"]) {
      expect(BADGES[id]).toBeDefined();
      expect(BADGES[id].glyph).toBeTruthy();
      expect(BADGES[id].label).toBeTruthy();
    }
  });
});

function addDaysForTest(isoDate, days) {
  return addDays(isoDate, days);
}

describe("searchableFields", () => {
  it("matches on the activity label — what is actually being counted", () => {
    const fields = searchableFields({ name: "March push", activity_label: "steps", unit_label: "steps", note: "" });
    expect(fields).toContain("steps");
  });
});

describe("challengeCreateStatements", () => {
  const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const STAMP = "2026-03-02T10:11:12.345Z";
  const challenge = (over = {}) => ({
    id: ID, name: "Steps", activity_label: "Steps", unit_label: "steps", mode: "team",
    start_date: "2026-03-02", end_date: "2026-03-09", created_by: "m0", created_at: STAMP, ...over,
  });
  const partsOf = (n, teamId = null) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, member_id: `m${i}`, team_id: teamId }));
  const teamsOf = n => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, color: "#000" }));
  const binds = s => s.sql.split("?").length - 1;

  it("puts every participant in ONE INSERT within 100 bound values, at the cap", () => {
    const statements = challengeCreateStatements(challenge(), teamsOf(MAX_PARTICIPANTS), partsOf(MAX_PARTICIPANTS, "t0"));
    expect(MAX_PARTICIPANTS).toBe(33);
    const partInserts = statements.filter(s => /ffc_participants/.test(s.sql));
    expect(partInserts).toHaveLength(1);
    expect(statements.length).toBeLessThanOrEqual(25);
    for (const s of statements) {
      expect(binds(s)).toBe(s.params.length);
      expect(s.params.length).toBeLessThanOrEqual(100);
    }
    expect(partInserts[0].params).toHaveLength(MAX_PARTICIPANTS * 3);
  });

  it("writes the challenge id and stamp as literals on each participant row and binds the rest", () => {
    const statements = challengeCreateStatements(challenge({ mode: "individual" }), [], partsOf(2));
    expect(statements).toHaveLength(2);
    const part = statements[1];
    expect(part.sql).toContain(`(?, '${ID}', ?, ?, '${STAMP}'), (?, '${ID}', ?, ?, '${STAMP}')`);
    expect(part.params).toEqual(["p0", "m0", null, "p1", "m1", null]);
    expect(statements[0].params[0]).toBe(ID);
    expect(statements[0].params.at(-1)).toBe(STAMP);
  });

  it("binds teams under the challenge id, 25 to an INSERT", () => {
    const statements = challengeCreateStatements(challenge(), teamsOf(26), partsOf(26, "t0"));
    const teamInserts = statements.filter(s => /ffc_teams/.test(s.sql));
    expect(teamInserts.map(s => s.params.length)).toEqual([100, 4]);
    expect(teamInserts[1].params).toEqual(["t25", ID, "Team 25", "#000"]);
  });

  it("accepts a stamp without milliseconds", () => {
    expect(challengeCreateStatements(challenge({ created_at: "2026-03-02T10:11:12Z" }), [], partsOf(1))).not.toBeNull();
  });

  it("refuses more participants than one INSERT can bind", () => {
    expect(challengeCreateStatements(challenge(), [], partsOf(MAX_PARTICIPANTS + 1))).toBeNull();
  });

  it.each([
    ["an id with a quote", { id: "0f8fad5b-d9cb-469f-a165-70867728950e'" }],
    ["an injected id", { id: "x'); DROP TABLE t; --" }],
    ["an empty id", { id: "" }],
    ["a non-UUID id", { id: "challenge-1" }],
    ["a stamp with an offset", { created_at: "2026-03-02T10:11:12+01:00" }],
    ["a stamp with a quote", { created_at: "2026-03-02T10:11:12Z'" }],
    ["a date-only stamp", { created_at: "2026-03-02" }],
    ["a missing stamp", { created_at: undefined }],
  ])("refuses to build with %s", (_label, over) => {
    expect(challengeCreateStatements(challenge(over), [], partsOf(1))).toBeNull();
  });
});
