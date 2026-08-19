/**
 * Calendar helpers that treat a timezone's civil dates as UTC midnights.
 * That keeps Monday-Sunday week math independent of the server's locale.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats an instant as YYYY-MM-DD in the given IANA timezone.
 */
export function zonedYmd(instant: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(instant);

	const value = (type: Intl.DateTimeFormatPartTypes) => {
		const part = parts.find((entry) => entry.type === type);
		if (!part) {
			throw new Error(`Missing date part: ${type}`);
		}
		return part.value;
	};

	return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Parses a YYYY-MM-DD civil date into a UTC midnight Date.
 */
export function parseYmd(ymd: string): Date {
	const match = YMD.exec(ymd);
	if (!match) {
		throw new Error(`Invalid date: ${ymd}`);
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a UTC midnight Date as YYYY-MM-DD.
 */
export function formatYmd(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Returns the Monday YYYY-MM-DD for the week containing `ymd`.
 */
export function mondayOf(ymd: string): string {
	const date = parseYmd(ymd);
	const weekday = date.getUTCDay();
	const offset = weekday === 0 ? 6 : weekday - 1;
	date.setUTCDate(date.getUTCDate() - offset);
	return formatYmd(date);
}

/**
 * Shifts a civil date by a number of days.
 */
export function addDays(ymd: string, days: number): string {
	const date = parseYmd(ymd);
	date.setUTCDate(date.getUTCDate() + days);
	return formatYmd(date);
}

/**
 * Inclusive list of Monday through Sunday for a week id.
 */
export function weekDates(weekId: string): string[] {
	return Array.from({ length: 7 }, (_, index) => addDays(weekId, index));
}

/**
 * Short weekday label (Mon, Tue, ...) for a civil date.
 */
export function weekdayLabel(ymd: string): string {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		timeZone: "UTC",
	}).format(parseYmd(ymd));
}

/**
 * Human week range such as "Aug 17 – Aug 23".
 */
export function weekRangeLabel(weekId: string): string {
	const start = parseYmd(weekId);
	const end = parseYmd(addDays(weekId, 6));
	const format = (date: Date) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			timeZone: "UTC",
		}).format(date);

	return `${format(start)} – ${format(end)}`;
}

/**
 * Counts whole days between two civil dates.
 */
export function diffDays(fromYmd: string, toYmd: string): number {
	const from = parseYmd(fromYmd).getTime();
	const to = parseYmd(toYmd).getTime();
	return Math.round((to - from) / 86_400_000);
}

/**
 * Formats a UTC instant in the tracker timezone, e.g. "Wed, Aug 19, 3:14 PM".
 */
export function formatCallTime(iso: string, timeZone: string): string {
	return new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));
}
