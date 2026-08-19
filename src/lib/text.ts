/**
 * Trims, collapses whitespace, and caps a short text field.
 */
export function sanitizeShortText(value: string, max: number): string {
	return value.trim().replace(/\s+/g, " ").slice(0, max);
}
