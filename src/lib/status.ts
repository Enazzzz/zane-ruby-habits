import { sanitizePersonName } from "@/lib/person";
import { sanitizeShortText } from "@/lib/text";
import type { StatusRecord } from "@/lib/types";

/** Longest status field the UI accepts. */
export const MAX_STATUS_FIELD = 48;

/**
 * Trims the three status fields for one person.
 */
export function sanitizeStatus(
	name: string,
	listeningTo: string,
	location: string,
	doing: string,
): Omit<StatusRecord, "at"> {
	return {
		name: sanitizePersonName(name),
		listeningTo: sanitizeShortText(listeningTo, MAX_STATUS_FIELD),
		location: sanitizeShortText(location, MAX_STATUS_FIELD),
		doing: sanitizeShortText(doing, MAX_STATUS_FIELD),
	};
}

/**
 * Returns the newest status row for each person.
 */
export function latestStatusByName(statuses: StatusRecord[]): StatusRecord[] {
	const seen = new Set<string>();
	const latest: StatusRecord[] = [];

	for (const item of [...statuses].sort((a, b) => b.at.localeCompare(a.at))) {
		const key = item.name.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		latest.push(item);
	}

	return latest;
}
