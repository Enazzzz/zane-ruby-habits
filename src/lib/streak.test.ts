import { describe, expect, it } from "vitest";
import { addDays, mondayOf, weekDates, zonedYmd } from "./dates";
import {
	bestStreak,
	buildSnapshot,
	countForWeek,
	countsByDate,
	currentStreak,
} from "./streak";
import type { CallRecord } from "./types";

/** Builds a call at a known UTC instant. */
function callAt(iso: string): CallRecord {
	return { id: iso, at: iso };
}

describe("zoned dates", () => {
	it("maps late UTC hours onto the previous Los Angeles day in summer", () => {
		expect(zonedYmd(new Date("2026-08-19T06:00:00.000Z"), "America/Los_Angeles")).toBe(
			"2026-08-18",
		);
	});

	it("uses Monday as the start of the week", () => {
		expect(mondayOf("2026-08-19")).toBe("2026-08-17");
		expect(weekDates("2026-08-17")).toEqual([
			"2026-08-17",
			"2026-08-18",
			"2026-08-19",
			"2026-08-20",
			"2026-08-21",
			"2026-08-22",
			"2026-08-23",
		]);
	});
});

describe("streak math", () => {
	it("starts at zero with no completed week", () => {
		const weeks = [{ weekId: "2026-08-17", count: 3 }];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(0);
		expect(bestStreak(weeks, "2026-08-17", 5)).toBe(0);
	});

	it("counts the current week as soon as the goal is hit", () => {
		const weeks = [{ weekId: "2026-08-17", count: 5 }];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(1);
	});

	it("keeps last week's streak alive until the current week is over", () => {
		const weeks = [
			{ weekId: "2026-08-10", count: 5 },
			{ weekId: "2026-08-17", count: 2 },
		];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(1);
	});

	it("extends the streak when this week also hits the goal", () => {
		const weeks = [
			{ weekId: "2026-08-03", count: 6 },
			{ weekId: "2026-08-10", count: 5 },
			{ weekId: "2026-08-17", count: 5 },
		];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(3);
	});

	it("breaks after a missed completed week, then restarts", () => {
		const weeks = [
			{ weekId: "2026-08-03", count: 5 },
			{ weekId: "2026-08-10", count: 1 },
			{ weekId: "2026-08-17", count: 5 },
		];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(1);
		expect(bestStreak(weeks, "2026-08-17", 5)).toBe(1);
	});

	it("treats a skipped week as a break", () => {
		const weeks = [
			{ weekId: "2026-08-03", count: 5 },
			{ weekId: "2026-08-17", count: 5 },
		];
		expect(currentStreak(weeks, "2026-08-17", 5)).toBe(1);
		expect(bestStreak(weeks, "2026-08-17", 5)).toBe(1);
	});
});

describe("buildSnapshot", () => {
	it("puts two same-day calls on Wednesday and reports 2/5", () => {
		const snapshot = buildSnapshot(
			[
				callAt("2026-08-19T18:00:00.000Z"),
				callAt("2026-08-19T21:00:00.000Z"),
			],
			new Date("2026-08-19T22:00:00.000Z"),
			"file",
		);

		expect(snapshot.currentCount).toBe(2);
		expect(snapshot.remaining).toBe(3);
		expect(snapshot.goalMet).toBe(false);
		expect(snapshot.days.find((day) => day.date === "2026-08-19")?.count).toBe(2);
		expect(snapshot.streak).toBe(0);
	});

	it("counts five calls in the current week as a live streak", () => {
		const calls = Array.from({ length: 5 }, (_, index) =>
			callAt(`2026-08-17T18:0${index}:00.000Z`),
		);
		const snapshot = buildSnapshot(
			calls,
			new Date("2026-08-19T18:00:00.000Z"),
			"file",
		);
		expect(snapshot.goalMet).toBe(true);
		expect(snapshot.streak).toBe(1);
		expect(snapshot.bestStreak).toBe(1);
	});
});

describe("day grouping", () => {
	it("groups by timezone date rather than UTC date", () => {
		const counts = countsByDate(
			[callAt("2026-08-19T06:00:00.000Z")],
			"America/Los_Angeles",
		);
		expect(counts.get("2026-08-18")).toBe(1);
		expect(countForWeek(counts, "2026-08-17")).toBe(1);
		expect(addDays("2026-08-17", 1)).toBe("2026-08-18");
	});
});
