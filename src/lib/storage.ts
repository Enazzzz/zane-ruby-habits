import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { sanitizeBucketActor, sanitizeBucketText } from "@/lib/bucket";
import { sanitizeCheckIn } from "@/lib/checkins";
import {
	MAX_BUCKET_ITEMS,
	MAX_CALLS_PER_DAY,
	MAX_CALL_DURATION_MINUTES,
	MAX_CHECKINS,
	MAX_QUESTION_BANK,
	MAX_THINKING,
	REDIS_BUCKET_KEY,
	REDIS_CALLS_KEY,
	REDIS_CHECKINS_KEY,
	REDIS_DAILY_QUESTIONS_KEY,
	REDIS_QUESTION_BANK_KEY,
	REDIS_STATUS_KEY,
	REDIS_THINKING_KEY,
	TRACKER_TIMEZONE,
} from "@/lib/config";
import { zonedYmd } from "@/lib/dates";
import { parseDurationMinutes } from "@/lib/duration";
import { personKey } from "@/lib/person";
import {
	answerDailyQuestion,
	drawQuestionForDay,
	findDailyQuestion,
	sanitizeQuestionText,
} from "@/lib/questions";
import { sanitizeStatus } from "@/lib/status";
import { sanitizeThinkingFrom } from "@/lib/thinking";
import type {
	BucketItem,
	CallRecord,
	CheckInRecord,
	DailyQuestionRecord,
	QuestionBankItem,
	StatusRecord,
	ThinkingRecord,
} from "@/lib/types";

/** On-disk log used for local development when Redis is not configured. */
const FILE_PATH = path.join(process.cwd(), "data", "calls.json");

/** Canonical URL names, plus Vercel Marketplace KV aliases. */
const REDIS_URL_KEYS = ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"] as const;

/** Canonical token names, plus Vercel Marketplace KV aliases. */
const REDIS_TOKEN_KEYS = ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"] as const;

let redisClient: Redis | null | undefined;

type StatusMap = Record<string, StatusRecord>;

type FileStore = {
	calls: CallRecord[];
	checkIns: CheckInRecord[];
	statuses: StatusMap;
	thinking: ThinkingRecord[];
	questionBank: QuestionBankItem[];
	dailyQuestions: DailyQuestionRecord[];
	bucket: BucketItem[];
};

const EMPTY_STORE: FileStore = {
	calls: [],
	checkIns: [],
	statuses: {},
	thinking: [],
	questionBank: [],
	dailyQuestions: [],
	bucket: [],
};

/**
 * Reads Redis REST credentials from an env map.
 * Accepts official Upstash names, Marketplace KV names, and prefixed copies.
 */
export function readRedisCredentials(
	env: NodeJS.Dict<string | undefined> = process.env,
): { url: string; token: string } | null {
	const url = readEnvValue(env, REDIS_URL_KEYS);
	const token = readEnvValue(env, REDIS_TOKEN_KEYS);
	if (!url || !token) {
		return null;
	}
	return { url, token };
}

/**
 * Returns the first non-empty env value for a canonical name or `*_NAME` prefix.
 */
function readEnvValue(
	env: NodeJS.Dict<string | undefined>,
	names: readonly string[],
): string | undefined {
	for (const name of names) {
		const direct = env[name];
		if (direct) {
			return direct;
		}
	}

	const keys = Object.keys(env);
	for (const name of names) {
		const match = keys.find((key) => key.endsWith(`_${name}`) && env[key]);
		if (match) {
			return env[match];
		}
	}

	return undefined;
}

/**
 * Returns a Redis client when Upstash env vars are present.
 */
function getRedis(): Redis | null {
	if (redisClient !== undefined) {
		return redisClient;
	}

	const credentials = readRedisCredentials();
	redisClient = credentials
		? new Redis({ url: credentials.url, token: credentials.token })
		: null;
	return redisClient;
}

/**
 * Which backing store the tracker will use right now.
 */
export function getStorageKind(): "redis" | "file" | "missing" {
	if (getRedis()) {
		return "redis";
	}

	if (process.env.VERCEL) {
		return "missing";
	}

	return "file";
}

/**
 * Throws when production storage is not configured.
 */
function assertStorageReady(): void {
	if (getStorageKind() === "missing") {
		throw new Error(
			"Redis is not visible to this deploy. Connect the Upstash store to this Vercel project, then Redeploy.",
		);
	}
}

/**
 * Reads every logged call, oldest first.
 */
export async function listCalls(): Promise<CallRecord[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_CALLS_KEY, 0, -1);
		return rows.map(parseCall).filter((call): call is CallRecord => call !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).calls;
}

/**
 * Reads check-in notes, oldest first.
 */
export async function listCheckIns(): Promise<CheckInRecord[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_CHECKINS_KEY, 0, -1);
		return rows
			.map(parseCheckIn)
			.filter((item): item is CheckInRecord => item !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).checkIns;
}

/**
 * Reads the latest status for each person.
 */
export async function listStatuses(): Promise<StatusRecord[]> {
	const redis = getRedis();
	if (redis) {
		const raw = await redis.get<string>(REDIS_STATUS_KEY);
		return statusMapToList(parseStatusMap(raw));
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return statusMapToList((await readFileStore()).statuses);
}

/**
 * Reads thinking-of-you pings, oldest first.
 */
export async function listThinking(): Promise<ThinkingRecord[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_THINKING_KEY, 0, -1);
		return rows
			.map(parseThinking)
			.filter((item): item is ThinkingRecord => item !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).thinking;
}

/**
 * Reads questions waiting in the bank.
 */
export async function listQuestionBank(): Promise<QuestionBankItem[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_QUESTION_BANK_KEY, 0, -1);
		return rows
			.map(parseQuestionBankItem)
			.filter((item): item is QuestionBankItem => item !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).questionBank;
}

/**
 * Reads past daily questions, oldest first.
 */
export async function listDailyQuestions(): Promise<DailyQuestionRecord[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_DAILY_QUESTIONS_KEY, 0, -1);
		return rows
			.map(parseDailyQuestion)
			.filter((item): item is DailyQuestionRecord => item !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).dailyQuestions;
}

/**
 * Reads bucket-list items, oldest first.
 */
export async function listBucket(): Promise<BucketItem[]> {
	const redis = getRedis();
	if (redis) {
		const rows = await redis.lrange<string>(REDIS_BUCKET_KEY, 0, -1);
		return rows.map(parseBucketItem).filter((item): item is BucketItem => item !== null);
	}

	if (getStorageKind() === "missing") {
		return [];
	}

	return (await readFileStore()).bucket;
}

/**
 * Appends a call at `at`, rejecting empty production storage and daily spam.
 */
export async function addCall(
	at = new Date(),
	durationMinutes?: number,
): Promise<CallRecord> {
	assertStorageReady();

	const parsedDuration =
		durationMinutes === undefined ? undefined : parseDurationMinutes(String(durationMinutes));

	const calls = await listCalls();
	const today = zonedYmd(at, TRACKER_TIMEZONE);
	const todayCount = calls.filter(
		(call) => zonedYmd(new Date(call.at), TRACKER_TIMEZONE) === today,
	).length;

	if (todayCount >= MAX_CALLS_PER_DAY) {
		throw new Error("Already logged today's call.");
	}

	const record: CallRecord = {
		id: crypto.randomUUID(),
		at: at.toISOString(),
		...(parsedDuration === undefined ? {} : { durationMinutes: parsedDuration }),
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_CALLS_KEY, JSON.stringify(record));
		return record;
	}

	const store = await readFileStore();
	await writeFileStore({ ...store, calls: [...store.calls, record] });
	return record;
}

/**
 * Updates today's call duration, or adds duration to the most recent call today.
 */
export async function setTodayCallDuration(rawMinutes: string): Promise<CallRecord> {
	assertStorageReady();

	const durationMinutes = parseDurationMinutes(rawMinutes);
	const calls = await listCalls();
	const today = zonedYmd(new Date(), TRACKER_TIMEZONE);
	const index = calls.findIndex(
		(call) => zonedYmd(new Date(call.at), TRACKER_TIMEZONE) === today,
	);

	if (index === -1) {
		throw new Error("Log today's call before adding a length.");
	}

	const updated = {
		...calls[index]!,
		durationMinutes,
	};
	const nextCalls = [...calls];
	nextCalls[index] = updated;

	const redis = getRedis();
	if (redis) {
		await redis.del(REDIS_CALLS_KEY);
		if (nextCalls.length > 0) {
			await redis.rpush(
				REDIS_CALLS_KEY,
				...nextCalls.map((call) => JSON.stringify(call)),
			);
		}
		return updated;
	}

	const store = await readFileStore();
	await writeFileStore({ ...store, calls: nextCalls });
	return updated;
}

/**
 * Saves a named check-in note with an automatic timestamp.
 */
export async function addCheckIn(
	name: string,
	message: string,
	at = new Date(),
): Promise<CheckInRecord> {
	assertStorageReady();

	const cleaned = sanitizeCheckIn(name, message);
	const record: CheckInRecord = {
		id: crypto.randomUUID(),
		name: cleaned.name,
		message: cleaned.message,
		at: at.toISOString(),
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_CHECKINS_KEY, JSON.stringify(record));
		const length = await redis.llen(REDIS_CHECKINS_KEY);
		if (length > MAX_CHECKINS) {
			await redis.ltrim(REDIS_CHECKINS_KEY, -MAX_CHECKINS, -1);
		}
		return record;
	}

	const store = await readFileStore();
	const checkIns = [...store.checkIns, record].slice(-MAX_CHECKINS);
	await writeFileStore({ ...store, checkIns });
	return record;
}

/**
 * Overwrites one person's current status fields.
 */
export async function updateStatus(
	name: string,
	listeningTo: string,
	location: string,
	doing: string,
	at = new Date(),
): Promise<StatusRecord> {
	assertStorageReady();

	const cleaned = sanitizeStatus(name, listeningTo, location, doing);
	const record: StatusRecord = { ...cleaned, at: at.toISOString() };
	const key = personKey(record.name);

	const redis = getRedis();
	if (redis) {
		const map = parseStatusMap(await redis.get<string>(REDIS_STATUS_KEY));
		map[key] = record;
		await redis.set(REDIS_STATUS_KEY, JSON.stringify(map));
		return record;
	}

	const store = await readFileStore();
	await writeFileStore({
		...store,
		statuses: { ...store.statuses, [key]: record },
	});
	return record;
}

/**
 * Appends a thinking-of-you ping.
 */
export async function addThinking(from: string, at = new Date()): Promise<ThinkingRecord> {
	assertStorageReady();

	const record: ThinkingRecord = {
		id: crypto.randomUUID(),
		from: sanitizeThinkingFrom(from),
		at: at.toISOString(),
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_THINKING_KEY, JSON.stringify(record));
		const length = await redis.llen(REDIS_THINKING_KEY);
		if (length > MAX_THINKING) {
			await redis.ltrim(REDIS_THINKING_KEY, -MAX_THINKING, -1);
		}
		return record;
	}

	const store = await readFileStore();
	const thinking = [...store.thinking, record].slice(-MAX_THINKING);
	await writeFileStore({ ...store, thinking });
	return record;
}

/**
 * Adds a suggested question to the bank.
 */
export async function suggestQuestion(
	text: string,
	suggestedBy: string,
	at = new Date(),
): Promise<QuestionBankItem> {
	assertStorageReady();

	const record: QuestionBankItem = {
		id: crypto.randomUUID(),
		text: sanitizeQuestionText(text),
		suggestedBy: sanitizeThinkingFrom(suggestedBy),
		at: at.toISOString(),
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_QUESTION_BANK_KEY, JSON.stringify(record));
		const length = await redis.llen(REDIS_QUESTION_BANK_KEY);
		if (length > MAX_QUESTION_BANK) {
			await redis.ltrim(REDIS_QUESTION_BANK_KEY, -MAX_QUESTION_BANK, -1);
		}
		return record;
	}

	const store = await readFileStore();
	const questionBank = [...store.questionBank, record].slice(-MAX_QUESTION_BANK);
	await writeFileStore({ ...store, questionBank });
	return record;
}

/**
 * Returns today's question, drawing one from the bank when needed.
 */
export async function getTodayQuestion(now = new Date()): Promise<DailyQuestionRecord | null> {
	assertStorageReady();

	const today = zonedYmd(now, TRACKER_TIMEZONE);
	const dailyQuestions = await listDailyQuestions();
	const existing = findDailyQuestion(dailyQuestions, today);
	if (existing) {
		return existing;
	}

	const bank = await listQuestionBank();
	const drawn = drawQuestionForDay(bank, today);
	if (!drawn) {
		return null;
	}

	const redis = getRedis();
	if (redis) {
		await redis.del(REDIS_QUESTION_BANK_KEY);
		if (drawn.bank.length > 0) {
			await redis.rpush(
				REDIS_QUESTION_BANK_KEY,
				...drawn.bank.map((item) => JSON.stringify(item)),
			);
		}
		await redis.rpush(REDIS_DAILY_QUESTIONS_KEY, JSON.stringify(drawn.daily));
		return drawn.daily;
	}

	const store = await readFileStore();
	await writeFileStore({
		...store,
		questionBank: drawn.bank,
		dailyQuestions: [...store.dailyQuestions, drawn.daily],
	});
	return drawn.daily;
}

/**
 * Saves one person's answer to today's question.
 */
export async function answerTodayQuestion(
	name: string,
	answer: string,
	now = new Date(),
): Promise<DailyQuestionRecord> {
	assertStorageReady();

	const question = await getTodayQuestion(now);
	if (!question) {
		throw new Error("There is no question today yet. Add one to the bank first.");
	}

	const updated = answerDailyQuestion(question, name, answer, now.toISOString());
	const dailyQuestions = await listDailyQuestions();
	const nextDaily = dailyQuestions.map((item) =>
		item.date === updated.date ? updated : item,
	);

	const redis = getRedis();
	if (redis) {
		await redis.del(REDIS_DAILY_QUESTIONS_KEY);
		if (nextDaily.length > 0) {
			await redis.rpush(
				REDIS_DAILY_QUESTIONS_KEY,
				...nextDaily.map((item) => JSON.stringify(item)),
			);
		}
		return updated;
	}

	const store = await readFileStore();
	await writeFileStore({ ...store, dailyQuestions: nextDaily });
	return updated;
}

/**
 * Adds one open bucket-list item.
 */
export async function addBucketItem(
	text: string,
	addedBy: string,
	at = new Date(),
): Promise<BucketItem> {
	assertStorageReady();

	const record: BucketItem = {
		id: crypto.randomUUID(),
		text: sanitizeBucketText(text),
		done: false,
		addedBy: sanitizeBucketActor(addedBy),
		addedAt: at.toISOString(),
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_BUCKET_KEY, JSON.stringify(record));
		const length = await redis.llen(REDIS_BUCKET_KEY);
		if (length > MAX_BUCKET_ITEMS) {
			await redis.ltrim(REDIS_BUCKET_KEY, -MAX_BUCKET_ITEMS, -1);
		}
		return record;
	}

	const store = await readFileStore();
	const bucket = [...store.bucket, record].slice(-MAX_BUCKET_ITEMS);
	await writeFileStore({ ...store, bucket });
	return record;
}

/**
 * Toggles one bucket item open or done.
 */
export async function toggleBucketItem(
	id: string,
	done: boolean,
	actor: string,
	at = new Date(),
): Promise<BucketItem> {
	assertStorageReady();

	const bucket = await listBucket();
	const index = bucket.findIndex((item) => item.id === id);
	if (index === -1) {
		throw new Error("That bucket-list item is gone.");
	}

	const cleanActor = sanitizeBucketActor(actor);
	const current = bucket[index]!;
	const updated: BucketItem = done
		? {
				...current,
				done: true,
				doneBy: cleanActor,
				doneAt: at.toISOString(),
			}
		: {
				...current,
				done: false,
				doneBy: undefined,
				doneAt: undefined,
			};

	const nextBucket = [...bucket];
	nextBucket[index] = updated;

	const redis = getRedis();
	if (redis) {
		await redis.del(REDIS_BUCKET_KEY);
		if (nextBucket.length > 0) {
			await redis.rpush(
				REDIS_BUCKET_KEY,
				...nextBucket.map((item) => JSON.stringify(item)),
			);
		}
		return updated;
	}

	const store = await readFileStore();
	await writeFileStore({ ...store, bucket: nextBucket });
	return updated;
}

/**
 * Removes one bucket-list item entirely.
 */
export async function removeBucketItem(id: string): Promise<void> {
	assertStorageReady();

	const bucket = await listBucket();
	const nextBucket = bucket.filter((item) => item.id !== id);
	if (nextBucket.length === bucket.length) {
		throw new Error("That bucket-list item is gone.");
	}

	const redis = getRedis();
	if (redis) {
		await redis.del(REDIS_BUCKET_KEY);
		if (nextBucket.length > 0) {
			await redis.rpush(
				REDIS_BUCKET_KEY,
				...nextBucket.map((item) => JSON.stringify(item)),
			);
		}
		return;
	}

	const store = await readFileStore();
	await writeFileStore({ ...store, bucket: nextBucket });
}

/**
 * Removes the most recently logged call, if any.
 */
export async function removeLastCall(): Promise<CallRecord | null> {
	assertStorageReady();

	const redis = getRedis();
	if (redis) {
		const raw = await redis.rpop<string>(REDIS_CALLS_KEY);
		return raw ? parseCall(raw) : null;
	}

	const store = await readFileStore();
	const last = store.calls.pop() ?? null;
	await writeFileStore({ ...store, calls: store.calls });
	return last;
}

/**
 * Parses a Redis list entry into a call record.
 */
function parseCall(raw: string | CallRecord): CallRecord | null {
	if (typeof raw === "object" && raw && "id" in raw && "at" in raw) {
		return normalizeCall(raw as CallRecord);
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		return normalizeCall(JSON.parse(raw) as CallRecord);
	} catch {
		return null;
	}
}

/**
 * Normalizes optional call duration on a parsed record.
 */
function normalizeCall(parsed: CallRecord): CallRecord | null {
	if (typeof parsed.id !== "string" || typeof parsed.at !== "string") {
		return null;
	}
	if (
		parsed.durationMinutes !== undefined &&
		(typeof parsed.durationMinutes !== "number" ||
			parsed.durationMinutes < 1 ||
			parsed.durationMinutes > MAX_CALL_DURATION_MINUTES)
	) {
		return { id: parsed.id, at: parsed.at };
	}
	return parsed;
}

/**
 * Parses a Redis list entry into a check-in note.
 */
function parseCheckIn(raw: string | CheckInRecord): CheckInRecord | null {
	if (
		typeof raw === "object" &&
		raw &&
		"id" in raw &&
		"name" in raw &&
		"at" in raw
	) {
		return raw as CheckInRecord;
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as CheckInRecord;
		if (
			typeof parsed.id === "string" &&
			typeof parsed.name === "string" &&
			typeof parsed.at === "string"
		) {
			return {
				id: parsed.id,
				name: parsed.name,
				message: typeof parsed.message === "string" ? parsed.message : "",
				at: parsed.at,
			};
		}
	} catch {
		return null;
	}

	return null;
}

/**
 * Parses a thinking ping from Redis or disk.
 */
function parseThinking(raw: string | ThinkingRecord): ThinkingRecord | null {
	if (typeof raw === "object" && raw && "id" in raw && "from" in raw && "at" in raw) {
		return raw as ThinkingRecord;
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as ThinkingRecord;
		if (
			typeof parsed.id === "string" &&
			typeof parsed.from === "string" &&
			typeof parsed.at === "string"
		) {
			return parsed;
		}
	} catch {
		return null;
	}

	return null;
}

/**
 * Parses one bank question from Redis or disk.
 */
function parseQuestionBankItem(raw: string | QuestionBankItem): QuestionBankItem | null {
	if (typeof raw === "object" && raw && "id" in raw && "text" in raw) {
		return raw as QuestionBankItem;
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as QuestionBankItem;
		if (
			typeof parsed.id === "string" &&
			typeof parsed.text === "string" &&
			typeof parsed.suggestedBy === "string" &&
			typeof parsed.at === "string"
		) {
			return parsed;
		}
	} catch {
		return null;
	}

	return null;
}

/**
 * Parses one daily question from Redis or disk.
 */
function parseDailyQuestion(raw: string | DailyQuestionRecord): DailyQuestionRecord | null {
	if (typeof raw === "object" && raw && "id" in raw && "date" in raw && "text" in raw) {
		return normalizeDailyQuestion(raw as DailyQuestionRecord);
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		return normalizeDailyQuestion(JSON.parse(raw) as DailyQuestionRecord);
	} catch {
		return null;
	}
}

/**
 * Ensures daily question answers deserialize as strings.
 */
function normalizeDailyQuestion(parsed: DailyQuestionRecord): DailyQuestionRecord | null {
	if (
		typeof parsed.id !== "string" ||
		typeof parsed.date !== "string" ||
		typeof parsed.text !== "string"
	) {
		return null;
	}

	const answers: DailyQuestionRecord["answers"] = {};
	if (parsed.answers && typeof parsed.answers === "object") {
		for (const [name, value] of Object.entries(parsed.answers)) {
			if (
				value &&
				typeof value === "object" &&
				"text" in value &&
				"at" in value &&
				typeof value.text === "string" &&
				typeof value.at === "string"
			) {
				answers[name] = { text: value.text, at: value.at };
			}
		}
	}

	return { id: parsed.id, date: parsed.date, text: parsed.text, answers };
}

/**
 * Parses one bucket item from Redis or disk.
 */
function parseBucketItem(raw: string | BucketItem): BucketItem | null {
	if (typeof raw === "object" && raw && "id" in raw && "text" in raw) {
		return raw as BucketItem;
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as BucketItem;
		if (
			typeof parsed.id === "string" &&
			typeof parsed.text === "string" &&
			typeof parsed.addedBy === "string" &&
			typeof parsed.addedAt === "string" &&
			typeof parsed.done === "boolean"
		) {
			return parsed;
		}
	} catch {
		return null;
	}

	return null;
}

/**
 * Parses the status map blob from Redis or disk.
 */
function parseStatusMap(raw: string | StatusMap | null | undefined): StatusMap {
	if (!raw) {
		return {};
	}

	if (typeof raw === "object") {
		return raw as StatusMap;
	}

	try {
		const parsed = JSON.parse(raw) as StatusMap;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * Turns a status map into a list sorted newest-first.
 */
function statusMapToList(map: StatusMap): StatusRecord[] {
	return Object.values(map).sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Loads the local JSON log, returning empty lists when the file is missing.
 */
async function readFileStore(): Promise<FileStore> {
	try {
		const contents = await readFile(FILE_PATH, "utf8");
		const parsed = JSON.parse(contents) as Partial<FileStore> & {
			calls?: CallRecord[];
			checkIns?: CheckInRecord[];
		};
		return {
			calls: Array.isArray(parsed.calls) ? parsed.calls.map((call) => normalizeCall(call)).filter(Boolean) as CallRecord[] : [],
			checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : [],
			statuses: parsed.statuses && typeof parsed.statuses === "object" ? parsed.statuses : {},
			thinking: Array.isArray(parsed.thinking) ? parsed.thinking : [],
			questionBank: Array.isArray(parsed.questionBank) ? parsed.questionBank : [],
			dailyQuestions: Array.isArray(parsed.dailyQuestions)
				? parsed.dailyQuestions
						.map((item) => parseDailyQuestion(item as DailyQuestionRecord))
						.filter((item): item is DailyQuestionRecord => item !== null)
				: [],
			bucket: Array.isArray(parsed.bucket) ? parsed.bucket : [],
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { ...EMPTY_STORE };
		}
		throw error;
	}
}

/**
 * Writes the local JSON log, creating the data directory if needed.
 */
async function writeFileStore(store: FileStore): Promise<void> {
	await mkdir(path.dirname(FILE_PATH), { recursive: true });
	await writeFile(FILE_PATH, `${JSON.stringify(store, null, "\t")}\n`, "utf8");
}
