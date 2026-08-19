import type { CheckInRecord } from "@/lib/types";

/** Longest name a check-in will keep. */
export const MAX_CHECKIN_NAME = 24;

/** Longest note a check-in will keep. */
export const MAX_CHECKIN_MESSAGE = 80;

/**
 * Trims and caps a check-in name and note.
 */
export function sanitizeCheckIn(
	name: string,
	message: string,
): { name: string; message: string } {
	const cleanName = name.trim().replace(/\s+/g, " ").slice(0, MAX_CHECKIN_NAME);
	const cleanMessage = message.trim().replace(/\s+/g, " ").slice(0, MAX_CHECKIN_MESSAGE);

	if (!cleanName) {
		throw new Error("Add your name so the other person knows who stopped by.");
	}

	return { name: cleanName, message: cleanMessage };
}

/**
 * Newest check-in for each name, case-insensitive, newest names first.
 */
export function latestCheckInByName(checkIns: CheckInRecord[]): CheckInRecord[] {
	const seen = new Set<string>();
	const latest: CheckInRecord[] = [];

	for (const item of [...checkIns].sort((a, b) => b.at.localeCompare(a.at))) {
		const key = item.name.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		latest.push(item);
	}

	return latest;
}
