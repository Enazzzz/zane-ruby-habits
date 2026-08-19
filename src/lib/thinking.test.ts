import { describe, expect, it } from "vitest";
import { buildThinkingStats } from "./thinking";
import type { ThinkingRecord } from "./types";

describe("buildThinkingStats", () => {
	it("counts pings and keeps the newest timestamp per person", () => {
		const pings: ThinkingRecord[] = [
			{ id: "1", from: "Zane", at: "2026-08-19T10:00:00.000Z" },
			{ id: "2", from: "Ruby", at: "2026-08-19T11:00:00.000Z" },
			{ id: "3", from: "zane", at: "2026-08-19T12:00:00.000Z" },
		];

		const stats = buildThinkingStats(pings, ["Zane", "Ruby"]);
		expect(stats.countByPerson.Zane).toBe(2);
		expect(stats.countByPerson.Ruby).toBe(1);
		expect(stats.lastByPerson.Zane).toBe("2026-08-19T12:00:00.000Z");
	});
});
