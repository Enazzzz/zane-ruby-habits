import { MAX_CALL_DURATION_MINUTES } from "@/lib/config";

/**
 * Parses a whole-minute call duration from user input.
 */
export function parseDurationMinutes(raw: string): number | undefined {
	const trimmed = raw.trim();
	if (!trimmed) {
		return undefined;
	}

	const value = Number.parseInt(trimmed, 10);
	if (!Number.isFinite(value) || value < 1) {
		throw new Error("Enter call length as whole minutes, at least 1.");
	}
	if (value > MAX_CALL_DURATION_MINUTES) {
		throw new Error(`Call length cannot exceed ${MAX_CALL_DURATION_MINUTES} minutes.`);
	}
	return value;
}

/**
 * Formats minutes into a short human label such as "1h 23m".
 */
export function formatTalkMinutes(totalMinutes: number): string {
	if (totalMinutes <= 0) {
		return "0m";
	}
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) {
		return `${minutes}m`;
	}
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}

/**
 * Sums optional call durations, ignoring missing values.
 */
export function sumTalkMinutes(calls: { durationMinutes?: number }[]): number {
	return calls.reduce((total, call) => total + (call.durationMinutes ?? 0), 0);
}
