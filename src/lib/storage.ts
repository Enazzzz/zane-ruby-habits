import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { MAX_CALLS_PER_DAY, REDIS_CALLS_KEY, TRACKER_TIMEZONE } from "@/lib/config";
import { zonedYmd } from "@/lib/dates";
import type { CallRecord } from "@/lib/types";

/** On-disk log used for local development when Redis is not configured. */
const FILE_PATH = path.join(process.cwd(), "data", "calls.json");

/** Canonical URL names, plus Vercel Marketplace KV aliases. */
const REDIS_URL_KEYS = ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"] as const;

/** Canonical token names, plus Vercel Marketplace KV aliases. */
const REDIS_TOKEN_KEYS = ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"] as const;

let redisClient: Redis | null | undefined;

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

	return readFileStore();
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

	await writeFileStore([...calls, record]);
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

	const calls = await readFileStore();
	const last = calls.pop() ?? null;
	await writeFileStore(calls);
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
 * Loads the local JSON log, returning an empty list when the file is missing.
 */
async function readFileStore(): Promise<CallRecord[]> {
	try {
		const contents = await readFile(FILE_PATH, "utf8");
		const parsed = JSON.parse(contents) as { calls?: CallRecord[] };
		return Array.isArray(parsed.calls) ? parsed.calls : [];
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return [];
		}
		throw error;
	}
}

/**
 * Writes the local JSON log, creating the data directory if needed.
 */
async function writeFileStore(calls: CallRecord[]): Promise<void> {
	await mkdir(path.dirname(FILE_PATH), { recursive: true });
	await writeFile(FILE_PATH, `${JSON.stringify({ calls }, null, "\t")}\n`, "utf8");
}
