import { PEOPLE } from "@/lib/config";

/** Longest person name accepted across the app. */
export const MAX_PERSON_NAME = 24;

/**
 * Trims and validates a person name used on shared actions.
 */
export function sanitizePersonName(name: string): string {
	const clean = name.trim().replace(/\s+/g, " ").slice(0, MAX_PERSON_NAME);
	if (!clean) {
		throw new Error("Pick your name first.");
	}
	return clean;
}

/**
 * Case-insensitive lookup key for a person name.
 */
export function personKey(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Finds the canonical PEOPLE label for a typed name, if it matches.
 */
export function canonicalPerson(name: string): (typeof PEOPLE)[number] | null {
	const key = personKey(name);
	return PEOPLE.find((person) => personKey(person) === key) ?? null;
}
