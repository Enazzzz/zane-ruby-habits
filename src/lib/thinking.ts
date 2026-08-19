import { sanitizePersonName } from "@/lib/person";
import type { ThinkingRecord, ThinkingStats } from "@/lib/types";

/**
 * Builds last-ping and total-count stats for each person.
 */
export function buildThinkingStats(
	pings: ThinkingRecord[],
	people: readonly string[],
): ThinkingStats {
	const lastByPerson: Record<string, string | null> = {};
	const countByPerson: Record<string, number> = {};

	for (const person of people) {
		lastByPerson[person] = null;
		countByPerson[person] = 0;
	}

	for (const ping of [...pings].sort((a, b) => b.at.localeCompare(a.at))) {
		const match = people.find(
			(person) => person.toLowerCase() === ping.from.toLowerCase(),
		);
		if (!match) {
			continue;
		}
		countByPerson[match] = (countByPerson[match] ?? 0) + 1;
		if (!lastByPerson[match]) {
			lastByPerson[match] = ping.at;
		}
	}

	return { lastByPerson, countByPerson };
}

/**
 * Validates the sender on a thinking-of-you ping.
 */
export function sanitizeThinkingFrom(from: string): string {
	return sanitizePersonName(from);
}
