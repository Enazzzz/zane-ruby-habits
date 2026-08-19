import {
	WEEKLY_GOAL,
	PEOPLE,
	TRACKER_TIMEZONE,
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
 * Counts calls that fall on a given Monday-start week.
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
 * Consecutive weeks (newest first) that met the goal.
 * The in-progress week only counts once it has already hit the goal.
 * A missed completed week resets the streak to zero.
 */
export function currentStreak(
	weekCounts: Array<{ weekId: string; count: number }>,
	currentWeekId: string,
	goal: number,
): number {
	if (weekCounts.length === 0) {
		return 0;
	}

	const byId = new Map(weekCounts.map((week) => [week.weekId, week.count]));
	const newest = weekCounts[weekCounts.length - 1]?.weekId ?? currentWeekId;
	const oldest = weekCounts[0]?.weekId ?? currentWeekId;
	const ids = weekIdsBetween(oldest, newest);
	let cursor = currentWeekId;
	let streak = 0;

	if ((byId.get(currentWeekId) ?? 0) < goal) {
		cursor = addDays(currentWeekId, -7);
	}

	while (cursor >= ids[0]) {
		if ((byId.get(cursor) ?? 0) < goal) {
			break;
		}
		streak += 1;
		cursor = addDays(cursor, -7);
	}

	return streak;
}

/**
 * Longest run of consecutive goal-hitting weeks, including the current week
 * when it has already met the goal.
 */
export function bestStreak(
	weekCounts: Array<{ weekId: string; count: number }>,
	currentWeekId: string,
	goal: number,
): number {
	if (weekCounts.length === 0) {
		return 0;
	}

	const oldest = weekCounts[0].weekId;
	const ids = weekIdsBetween(oldest, currentWeekId);
	const byId = new Map(weekCounts.map((week) => [week.weekId, week.count]));
	let run = 0;
	let best = 0;

	for (const weekId of ids) {
		if ((byId.get(weekId) ?? 0) >= goal) {
			run += 1;
			best = Math.max(best, run);
		} else {
			run = 0;
		}
	}

	return best;
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
	},
): TrackerSnapshot {
	const timeZone = options?.timeZone ?? TRACKER_TIMEZONE;
	const goal = options?.goal ?? WEEKLY_GOAL;
	const today = zonedYmd(now, timeZone);
	const currentWeekId = mondayOf(today);
	const dayCounts = countsByDate(calls, timeZone);
	const oldestCallDay = calls.reduce((oldest, call) => {
		const day = zonedYmd(new Date(call.at), timeZone);
		return day < oldest ? day : oldest;
	}, today);
	const oldestWeekId = mondayOf(oldestCallDay);
	const ids = weekIdsBetween(oldestWeekId, currentWeekId);
	const weekCounts = ids.map((weekId) => ({
		weekId,
		count: countForWeek(dayCounts, weekId),
	}));

	const currentCount = countForWeek(dayCounts, currentWeekId);
	const days: DayCell[] = weekDates(currentWeekId).map((date) => ({
		date,
		label: weekdayLabel(date),
		count: dayCounts.get(date) ?? 0,
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

	const streak = currentStreak(weekCounts, currentWeekId, goal);
	const best = bestStreak(weekCounts, currentWeekId, goal);

	return {
		people: PEOPLE,
		timezone: timeZone,
		goal,
		currentCount,
		remaining: Math.max(0, goal - currentCount),
		goalMet: currentCount >= goal,
		streak,
		bestStreak: best,
		days,
		recentWeeks,
		calls: [...calls].sort((a, b) => b.at.localeCompare(a.at)),
		storage,
	};
}
