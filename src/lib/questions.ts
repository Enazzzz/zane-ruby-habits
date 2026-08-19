import { sanitizePersonName } from "@/lib/person";
import { sanitizeShortText } from "@/lib/text";
import type {
	DailyQuestionRecord,
	QuestionAnswer,
	QuestionBankItem,
} from "@/lib/types";

/** Longest question or answer text. */
export const MAX_QUESTION_TEXT = 160;

/** Longest daily answer text. */
export const MAX_ANSWER_TEXT = 280;

/**
 * Trims a suggested question before it enters the bank.
 */
export function sanitizeQuestionText(text: string): string {
	const clean = sanitizeShortText(text, MAX_QUESTION_TEXT);
	if (!clean) {
		throw new Error("Write a question before adding it to the bank.");
	}
	return clean;
}

/**
 * Trims a daily answer before saving it.
 */
export function sanitizeAnswerText(text: string): string {
	const clean = sanitizeShortText(text, MAX_ANSWER_TEXT);
	if (!clean) {
		throw new Error("Write an answer before saving.");
	}
	return clean;
}

/**
 * Finds the daily question record for a civil date, if any.
 */
export function findDailyQuestion(
	dailyQuestions: DailyQuestionRecord[],
	date: string,
): DailyQuestionRecord | null {
	return dailyQuestions.find((item) => item.date === date) ?? null;
}

/**
 * Draws one random bank item and returns the updated bank plus a new daily row.
 */
export function drawQuestionForDay(
	bank: QuestionBankItem[],
	date: string,
): { daily: DailyQuestionRecord; bank: QuestionBankItem[] } | null {
	if (bank.length === 0) {
		return null;
	}

	const index = Math.floor(Math.random() * bank.length);
	const picked = bank[index];
	if (!picked) {
		return null;
	}

	return {
		daily: {
			id: crypto.randomUUID(),
			date,
			text: picked.text,
			answers: {},
		},
		bank: bank.filter((item) => item.id !== picked.id),
	};
}

/**
 * Saves one person's answer on a daily question.
 */
export function answerDailyQuestion(
	question: DailyQuestionRecord,
	name: string,
	answer: string,
	at: string,
): DailyQuestionRecord {
	const cleanName = sanitizePersonName(name);
	const cleanAnswer = sanitizeAnswerText(answer);
	const answers: Record<string, QuestionAnswer> = { ...question.answers };
	answers[cleanName] = { text: cleanAnswer, at };
	return { ...question, answers };
}
