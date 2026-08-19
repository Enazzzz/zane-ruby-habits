import { describe, expect, it } from "vitest";
import { formatTalkMinutes, parseDurationMinutes, sumTalkMinutes } from "./duration";

describe("duration", () => {
	it("parses whole-minute call lengths", () => {
		expect(parseDurationMinutes("45")).toBe(45);
		expect(parseDurationMinutes("")).toBeUndefined();
	});

	it("formats talk minutes for display", () => {
		expect(formatTalkMinutes(83)).toBe("1h 23m");
		expect(formatTalkMinutes(60)).toBe("1h");
	});

	it("sums optional call durations", () => {
		expect(
			sumTalkMinutes([
				{ durationMinutes: 10 },
				{},
				{ durationMinutes: 5 },
			]),
		).toBe(15);
	});
});
