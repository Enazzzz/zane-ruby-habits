import { describe, expect, it } from "vitest";
import { drawQuestionForDay, findDailyQuestion, sanitizeQuestionText } from "./questions";
import type { DailyQuestionRecord, QuestionBankItem } from "./types";

describe("questions", () => {
	it("finds a daily question by date", () => {
		const daily: DailyQuestionRecord[] = [
			{ id: "1", date: "2026-08-19", text: "Favorite snack?", answers: {} },
		];
		expect(findDailyQuestion(daily, "2026-08-19")?.text).toBe("Favorite snack?");
		expect(findDailyQuestion(daily, "2026-08-20")).toBeNull();
	});

	it("draws one bank question for a day", () => {
		const bank: QuestionBankItem[] = [
			{
				id: "a",
				text: "Best song right now?",
				suggestedBy: "Zane",
				at: "2026-08-19T10:00:00.000Z",
			},
			{
				id: "b",
				text: "Dream trip?",
				suggestedBy: "Ruby",
				at: "2026-08-19T11:00:00.000Z",
			},
		];

		const originalRandom = Math.random;
		Math.random = () => 0;
		const drawn = drawQuestionForDay(bank, "2026-08-20");
		Math.random = originalRandom;

		expect(drawn?.daily.text).toBe("Best song right now?");
		expect(drawn?.bank).toHaveLength(1);
		expect(drawn?.bank[0]?.id).toBe("b");
	});

	it("rejects blank bank suggestions", () => {
		expect(() => sanitizeQuestionText("   ")).toThrow(/question/i);
	});
});
