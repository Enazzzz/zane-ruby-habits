import { describe, expect, it } from "vitest";
import { addDays, mondayOf, weekDates, zonedYmd } from "./dates";
import {
	bestDailyStreak,
	buildSnapshot,
	calledDaySet,
	countForWeek,
	countsByDate,
	currentDailyStreak,
	daysCalledInWeek,
	graceRemainingThisWeek,
} from "./streak";
import type { CallRecord } from "./types";

/** Builds a call at a known UTC instant. */
function callAt(iso: string): CallRecord {
	return { id: iso, at: iso };
}

/** Turns YYYY-MM-DD civil dates into noon-UTC calls (same calendar day in LA). */
function callsOn(...days: string[]): CallRecord[] {
	return days.map((day) => callAt(`${day}T19:00:00.000Z`));
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

describe("daily streak with weekly grace", () => {
	it("is zero with no calls", () => {
		expect(currentDailyStreak(new Set(), "2026-08-19")).toBe(0);
		expect(bestDailyStreak(new Set(), "2026-08-19")).toBe(0);
	});

	it("counts consecutive called days", () => {
		const called = new Set(["2026-08-17", "2026-08-18", "2026-08-19"]);
		expect(currentDailyStreak(called, "2026-08-19")).toBe(3);
		expect(bestDailyStreak(called, "2026-08-19")).toBe(3);
	});

	it("lets two missed days in a week ride on grace without adding to the tally", () => {
		const called = new Set([
			"2026-08-17",
			"2026-08-18",
			"2026-08-19",
			"2026-08-22",
			"2026-08-23",
		]);
		expect(currentDailyStreak(called, "2026-08-23")).toBe(5);
		expect(bestDailyStreak(called, "2026-08-23")).toBe(5);
	});

	it("breaks after a third miss in the same week, which is also under five days", () => {
		const called = new Set([
			"2026-08-17",
			"2026-08-18",
			"2026-08-19",
			"2026-08-23",
		]);
		expect(daysCalledInWeek(called, "2026-08-17")).toBe(4);
		expect(currentDailyStreak(called, "2026-08-23")).toBe(1);
		expect(currentDailyStreak(called, "2026-08-24")).toBe(0);
		expect(bestDailyStreak(called, "2026-08-24")).toBe(3);
	});

	it("does not treat today as a miss when no call has been logged yet", () => {
		const called = new Set(["2026-08-17", "2026-08-18"]);
		expect(currentDailyStreak(called, "2026-08-19")).toBe(2);
		expect(graceRemainingThisWeek(called, "2026-08-19")).toBe(2);
	});

	it("keeps last week's streak during an open week that still can hit five", () => {
		const called = new Set([
			"2026-08-10",
			"2026-08-11",
			"2026-08-12",
			"2026-08-13",
			"2026-08-14",
			"2026-08-17",
			"2026-08-18",
		]);
		expect(currentDailyStreak(called, "2026-08-19")).toBe(7);
	});
});

describe("buildSnapshot", () => {
	it("counts two same-day records as one call-day and one all-time call day", () => {
		const snapshot = buildSnapshot(
			[
				callAt("2026-08-19T18:00:00.000Z"),
				callAt("2026-08-19T21:00:00.000Z"),
			],
			new Date("2026-08-19T22:00:00.000Z"),
			"file",
		);

		expect(snapshot.currentCount).toBe(1);
		expect(snapshot.totalCalls).toBe(1);
		expect(snapshot.calledToday).toBe(true);
		expect(snapshot.remaining).toBe(4);
		expect(snapshot.days.find((day) => day.date === "2026-08-19")?.count).toBe(1);
		expect(snapshot.streak).toBe(1);
		expect(snapshot.bestStreak).toBe(1);
	});

	it("reports a five-day week as locked in with a live day streak", () => {
		const snapshot = buildSnapshot(
			callsOn(
				"2026-08-17",
				"2026-08-18",
				"2026-08-19",
				"2026-08-20",
				"2026-08-21",
			),
			new Date("2026-08-21T19:30:00.000Z"),
			"file",
		);
		expect(snapshot.goalMet).toBe(true);
		expect(snapshot.streak).toBe(5);
		expect(snapshot.bestStreak).toBe(5);
		expect(snapshot.totalCalls).toBe(5);
		expect(snapshot.graceRemaining).toBe(2);
	});
});

describe("day grouping", () => {
	it("groups by timezone date rather than UTC date", () => {
		const counts = countsByDate(
			[callAt("2026-08-19T06:00:00.000Z")],
			"America/Los_Angeles",
		);
		const called = calledDaySet(
			[callAt("2026-08-19T06:00:00.000Z")],
			"America/Los_Angeles",
		);
		expect(counts.get("2026-08-18")).toBe(1);
		expect(called.has("2026-08-18")).toBe(true);
		expect(countForWeek(counts, "2026-08-17")).toBe(1);
		expect(addDays("2026-08-17", 1)).toBe("2026-08-18");
	});
});
