import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { sanitizeCheckIn } from "@/lib/checkins";
import {
	MAX_CALLS_PER_DAY,
	MAX_CHECKINS,
	REDIS_CALLS_KEY,
	REDIS_CHECKINS_KEY,
	TRACKER_TIMEZONE,
} from "@/lib/config";
import { zonedYmd } from "@/lib/dates";
import type { CallRecord, CheckInRecord } from "@/lib/types";

/** On-disk log used for local development when Redis is not configured. */
const FILE_PATH = path.join(process.cwd(), "data", "calls.json");

/** Canonical URL names, plus Vercel Marketplace KV aliases. */
const REDIS_URL_KEYS = ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"] as const;

/** Canonical token names, plus Vercel Marketplace KV aliases. */
const REDIS_TOKEN_KEYS = ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"] as const;

let redisClient: Redis | null | undefined;

type FileStore = {
	calls: CallRecord[];
	checkIns: CheckInRecord[];
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
 * Lazy so `next build` can succeed before Marketplace storage is linked.
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
 * Appends a call at `at`, rejecting empty production storage and daily spam.
 */
export async function addCall(at = new Date()): Promise<CallRecord> {
	if (getStorageKind() === "missing") {
		throw new Error(
			"Redis is not visible to this deploy. Connect the Upstash store to this Vercel project, then Redeploy.",
		);
	}

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
	};

	const redis = getRedis();
	if (redis) {
		await redis.rpush(REDIS_CALLS_KEY, JSON.stringify(record));
		return record;
	}

	const store = await readFileStore();
	await writeFileStore({ calls: [...store.calls, record], checkIns: store.checkIns });
	return record;
}

/**
 * Saves a named check-in note with an automatic timestamp.
 */
export async function addCheckIn(
	name: string,
	message: string,
	at = new Date(),
): Promise<CheckInRecord> {
	if (getStorageKind() === "missing") {
		throw new Error(
			"Redis is not visible to this deploy. Connect the Upstash store to this Vercel project, then Redeploy.",
		);
	}

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
	await writeFileStore({ calls: store.calls, checkIns });
	return record;
}

/**
 * Removes the most recently logged call, if any.
 */
export async function removeLastCall(): Promise<CallRecord | null> {
	if (getStorageKind() === "missing") {
		throw new Error(
			"Redis is not visible to this deploy. Connect the Upstash store to this Vercel project, then Redeploy.",
		);
	}

	const redis = getRedis();
	if (redis) {
		const raw = await redis.rpop<string>(REDIS_CALLS_KEY);
		return raw ? parseCall(raw) : null;
	}

	const store = await readFileStore();
	const last = store.calls.pop() ?? null;
	await writeFileStore(store);
	return last;
}

/**
 * Parses a Redis list entry into a call record.
 */
function parseCall(raw: string | CallRecord): CallRecord | null {
	if (typeof raw === "object" && raw && "id" in raw && "at" in raw) {
		return raw as CallRecord;
	}

	if (typeof raw !== "string") {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as CallRecord;
		if (typeof parsed.id === "string" && typeof parsed.at === "string") {
			return parsed;
		}
	} catch {
		return null;
	}

	return null;
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
 * Loads the local JSON log, returning empty lists when the file is missing.
 */
async function readFileStore(): Promise<FileStore> {
	try {
		const contents = await readFile(FILE_PATH, "utf8");
		const parsed = JSON.parse(contents) as {
			calls?: CallRecord[];
			checkIns?: CheckInRecord[];
		};
		return {
			calls: Array.isArray(parsed.calls) ? parsed.calls : [],
			checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : [],
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { calls: [], checkIns: [] };
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
