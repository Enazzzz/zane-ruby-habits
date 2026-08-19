import { describe, expect, it } from "vitest";
import { latestCheckInByName, MAX_CHECKIN_MESSAGE, MAX_CHECKIN_NAME, sanitizeCheckIn } from "./checkins";
import type { CheckInRecord } from "./types";

describe("sanitizeCheckIn", () => {
	it("trims and keeps a short name and note", () => {
		expect(sanitizeCheckIn("  Zane  ", "  hey ruby  ")).toEqual({
			name: "Zane",
			message: "hey ruby",
		});
	});

	it("rejects a blank name", () => {
		expect(() => sanitizeCheckIn("   ", "hello")).toThrow(/name/i);
	});

	it("caps name and message length", () => {
		const name = "Z".repeat(40);
		const message = "x".repeat(120);
		const cleaned = sanitizeCheckIn(name, message);
		expect(cleaned.name).toHaveLength(MAX_CHECKIN_NAME);
		expect(cleaned.message).toHaveLength(MAX_CHECKIN_MESSAGE);
	});
});

describe("latestCheckInByName", () => {
	it("keeps only the newest note per person", () => {
		const checkIns: CheckInRecord[] = [
			{ id: "1", name: "Zane", message: "first", at: "2026-08-19T10:00:00.000Z" },
			{ id: "2", name: "Ruby", message: "hi", at: "2026-08-19T11:00:00.000Z" },
			{ id: "3", name: "zane", message: "later", at: "2026-08-19T12:00:00.000Z" },
		];

		expect(latestCheckInByName(checkIns).map((item) => item.message)).toEqual([
			"later",
			"hi",
		]);
	});
});
