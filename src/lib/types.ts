/**
 * One logged call between Zane and Ruby.
 */
export type CallRecord = {
	id: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
	/** Optional call length in whole minutes. */
	durationMinutes?: number;
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
 * A person's current status in three short fields.
 */
export type StatusRecord = {
	name: string;
	listeningTo: string;
	location: string;
	doing: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * One "thinking of you" ping from a named person.
 */
export type ThinkingRecord = {
	id: string;
	from: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * A suggested question waiting in the daily bank.
 */
export type QuestionBankItem = {
	id: string;
	text: string;
	suggestedBy: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * One person's answer to a daily question.
 */
export type QuestionAnswer = {
	text: string;
	/** ISO-8601 timestamp in UTC. */
	at: string;
};

/**
 * The question picked for one calendar day.
 */
export type DailyQuestionRecord = {
	id: string;
	/** Civil date YYYY-MM-DD in the tracker timezone. */
	date: string;
	text: string;
	answers: Record<string, QuestionAnswer>;
};

/**
 * One shared bucket-list item.
 */
export type BucketItem = {
	id: string;
	text: string;
	done: boolean;
	addedBy: string;
	/** ISO-8601 timestamp in UTC. */
	addedAt: string;
	doneBy?: string;
	/** ISO-8601 timestamp in UTC. */
	doneAt?: string;
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
	totalTalkMinutes: number;
	todayDurationMinutes: number | null;
	days: DayCell[];
	recentWeeks: WeekSummary[];
	calls: CallRecord[];
	storage: "redis" | "file" | "missing";
};

/**
 * Summary stats for thinking-of-you pings.
 */
export type ThinkingStats = {
	lastByPerson: Record<string, string | null>;
	countByPerson: Record<string, number>;
};

/**
 * Everything the homepage needs beyond the streak snapshot.
 */
export type TrackerExtras = {
	statuses: StatusRecord[];
	thinking: ThinkingRecord[];
	thinkingStats: ThinkingStats;
	todayQuestion: DailyQuestionRecord | null;
	questionBankCount: number;
	bucket: BucketItem[];
};
