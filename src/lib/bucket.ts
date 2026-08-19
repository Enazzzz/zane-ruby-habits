import { sanitizePersonName } from "@/lib/person";
import { sanitizeShortText } from "@/lib/text";
import type { BucketItem } from "@/lib/types";

/** Longest bucket-list item text. */
export const MAX_BUCKET_TEXT = 120;

/**
 * Trims a bucket-list item before saving it.
 */
export function sanitizeBucketText(text: string): string {
	const clean = sanitizeShortText(text, MAX_BUCKET_TEXT);
	if (!clean) {
		throw new Error("Write something for the bucket list first.");
	}
	return clean;
}

/**
 * Sorts open items first, then done items newest-first within each group.
 */
export function sortBucketItems(items: BucketItem[]): BucketItem[] {
	return [...items].sort((a, b) => {
		if (a.done !== b.done) {
			return a.done ? 1 : -1;
		}
		const aTime = a.done ? (a.doneAt ?? a.addedAt) : a.addedAt;
		const bTime = b.done ? (b.doneAt ?? b.addedAt) : b.addedAt;
		return bTime.localeCompare(aTime);
	});
}

/**
 * Validates the actor on a bucket-list mutation.
 */
export function sanitizeBucketActor(name: string): string {
	return sanitizePersonName(name);
}
