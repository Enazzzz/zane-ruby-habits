/**
 * One logged call between Zane and Ruby.
 */
export type CallRecord = {
	id: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * A named "I was here" note with an automatic timestamp.
 */
export type CheckInRecord = {
	id: string;
	name: string;
	message: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * One calendar day inside the current week view.
 */
export type DayCell = {
	date: string;
	label: string;
	count: number;
	isToday: boolean;
	isFuture: boolean;
};

/**
 * A completed or in-progress Monday-start week.
 */
export type WeekSummary = {
	weekId: string;
	label: string;
	count: number;
	met: boolean;
	isCurrent: boolean;
};

/**
 * Ready-to-render snapshot derived from the raw call log.
 */
export type TrackerSnapshot = {
	people: readonly string[];
	timezone: string;
	goal: number;
	gracePerWeek: number;
	graceRemaining: number;
	currentCount: number;
	remaining: number;
	goalMet: boolean;
	calledToday: boolean;
	streak: number;
	bestStreak: number;
	totalCalls: number;
	days: DayCell[];
	recentWeeks: WeekSummary[];
	calls: CallRecord[];
	storage: "redis" | "file" | "missing";
};
