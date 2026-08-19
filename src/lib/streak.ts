import {
	GRACE_DAYS_PER_WEEK,
	PEOPLE,
	TRACKER_TIMEZONE,
	WEEKLY_GOAL,
} from "@/lib/config";
import {
	addDays,
	mondayOf,
	weekDates,
	weekRangeLabel,
	weekdayLabel,
	zonedYmd,
} from "@/lib/dates";
import type {
	CallRecord,
	DayCell,
	TrackerSnapshot,
	WeekSummary,
} from "@/lib/types";

/**
 * Unique civil dates that have at least one call in the tracker timezone.
 */
export function calledDaySet(
	calls: CallRecord[],
	timeZone: string,
): Set<string> {
	const days = new Set<string>();
	for (const call of calls) {
		days.add(zonedYmd(new Date(call.at), timeZone));
	}
	return days;
}

/**
 * Groups calls onto civil dates in the tracker timezone.
 */
export function countsByDate(
	calls: CallRecord[],
	timeZone: string,
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const call of calls) {
		const day = zonedYmd(new Date(call.at), timeZone);
		counts.set(day, (counts.get(day) ?? 0) + 1);
	}

	return counts;
}

/**
 * Returns Monday week ids from `fromWeekId` through `toWeekId` inclusive.
 */
export function weekIdsBetween(fromWeekId: string, toWeekId: string): string[] {
	const weeks: string[] = [];
	let cursor = fromWeekId;

	while (cursor <= toWeekId) {
		weeks.push(cursor);
		cursor = addDays(cursor, 7);
	}

	return weeks;
}

/**
 * Counts unique call-days in a Monday-start week.
 */
export function daysCalledInWeek(called: Set<string>, weekId: string): number {
	return weekDates(weekId).filter((date) => called.has(date)).length;
}

/**
 * Counts call records that fall on a given Monday-start week.
 */
export function countForWeek(
	dayCounts: Map<string, number>,
	weekId: string,
): number {
	return weekDates(weekId).reduce(
		(total, date) => total + (dayCounts.get(date) ?? 0),
		0,
	);
}

/**
 * Earliest civil date in a set, or null when empty.
 */
function earliestDay(called: Set<string>): string | null {
	let first: string | null = null;
	for (const day of called) {
		if (!first || day < first) {
			first = day;
		}
	}
	return first;
}

/**
 * Current day streak: each called day counts, up to two missed days per week
 * are grace, and a finished week with fewer than five call-days breaks it.
 * Today without a call is still open, not a miss.
 */
export function currentDailyStreak(
	called: Set<string>,
	today: string,
	floor = WEEKLY_GOAL,
	gracePerWeek = GRACE_DAYS_PER_WEEK,
): number {
	const first = earliestDay(called);
	if (!first) {
		return 0;
	}

	const todayHasCall = called.has(today);
	let cursor = todayHasCall ? today : addDays(today, -1);
	if (cursor < first) {
		return todayHasCall ? 1 : 0;
	}

	const currentWeekId = mondayOf(today);
	const graceUsed = new Map<string, number>();
	let streak = 0;

	while (cursor >= first) {
		const weekId = mondayOf(cursor);
		if (weekId < currentWeekId && daysCalledInWeek(called, weekId) < floor) {
			break;
		}

		if (called.has(cursor)) {
			streak += 1;
		} else {
			const used = graceUsed.get(weekId) ?? 0;
			if (used < gracePerWeek) {
				graceUsed.set(weekId, used + 1);
			} else {
				break;
			}
		}

		cursor = addDays(cursor, -1);
	}

	return streak;
}

/**
 * Longest day streak ever, using the same grace and weekly-floor rules.
 */
export function bestDailyStreak(
	called: Set<string>,
	today: string,
	floor = WEEKLY_GOAL,
	gracePerWeek = GRACE_DAYS_PER_WEEK,
): number {
	const first = earliestDay(called);
	if (!first) {
		return 0;
	}

	let run = 0;
	let best = 0;
	let graceUsed = 0;
	let weekId = mondayOf(first);

	let cursor = first;
	while (cursor <= today) {
		const thisWeek = mondayOf(cursor);
		if (thisWeek !== weekId) {
			if (daysCalledInWeek(called, weekId) < floor) {
				run = 0;
			}
			graceUsed = 0;
			weekId = thisWeek;
		}

		if (called.has(cursor)) {
			run += 1;
			best = Math.max(best, run);
		} else if (cursor < today) {
			if (graceUsed < gracePerWeek) {
				graceUsed += 1;
			} else {
				run = 0;
			}
		}

		cursor = addDays(cursor, 1);
	}

	return best;
}

/**
 * Grace days still unused this week, ignoring today and future days.
 */
export function graceRemainingThisWeek(
	called: Set<string>,
	today: string,
	gracePerWeek = GRACE_DAYS_PER_WEEK,
): number {
	const weekId = mondayOf(today);
	const misses = weekDates(weekId).filter(
		(date) => date < today && !called.has(date),
	).length;
	return Math.max(0, gracePerWeek - misses);
}

/**
 * Builds the homepage snapshot from the raw call log.
 */
export function buildSnapshot(
	calls: CallRecord[],
	now: Date,
	storage: TrackerSnapshot["storage"],
	options?: {
		timeZone?: string;
		goal?: number;
		gracePerWeek?: number;
	},
): TrackerSnapshot {
	const timeZone = options?.timeZone ?? TRACKER_TIMEZONE;
	const goal = options?.goal ?? WEEKLY_GOAL;
	const gracePerWeek = options?.gracePerWeek ?? GRACE_DAYS_PER_WEEK;
	const today = zonedYmd(now, timeZone);
	const currentWeekId = mondayOf(today);
	const called = calledDaySet(calls, timeZone);
	const dayCounts = countsByDate(calls, timeZone);
	const oldestCallDay = earliestDay(called) ?? today;
	const oldestWeekId = mondayOf(oldestCallDay);
	const ids = weekIdsBetween(oldestWeekId, currentWeekId);
	const weekCounts = ids.map((weekId) => ({
		weekId,
		count: daysCalledInWeek(called, weekId),
	}));

	const currentCount = daysCalledInWeek(called, currentWeekId);
	const days: DayCell[] = weekDates(currentWeekId).map((date) => ({
		date,
		label: weekdayLabel(date),
		count: Math.min(1, dayCounts.get(date) ?? 0),
		isToday: date === today,
		isFuture: date > today,
	}));

	const recentWeeks: WeekSummary[] = [...weekCounts]
		.reverse()
		.slice(0, 8)
		.map((week) => ({
			weekId: week.weekId,
			label: weekRangeLabel(week.weekId),
			count: week.count,
			met: week.count >= goal,
			isCurrent: week.weekId === currentWeekId,
		}));

	return {
		people: PEOPLE,
		timezone: timeZone,
		goal,
		gracePerWeek,
		graceRemaining: graceRemainingThisWeek(called, today, gracePerWeek),
		currentCount,
		remaining: Math.max(0, goal - currentCount),
		goalMet: currentCount >= goal,
		calledToday: called.has(today),
		streak: currentDailyStreak(called, today, goal, gracePerWeek),
		bestStreak: bestDailyStreak(called, today, goal, gracePerWeek),
		totalCalls: called.size,
		days,
		recentWeeks,
		calls: [...calls].sort((a, b) => b.at.localeCompare(a.at)),
		storage,
	};
}
