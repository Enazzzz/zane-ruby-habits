import { describe, expect, it } from "vitest";
import { readRedisCredentials } from "./storage";

describe("readRedisCredentials", () => {
	it("reads the official Upstash REST names", () => {
		expect(
			readRedisCredentials({
				UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
				UPSTASH_REDIS_REST_TOKEN: "token-a",
			}),
		).toEqual({
			url: "https://example.upstash.io",
			token: "token-a",
		});
	});

	it("reads Vercel Marketplace KV names from stores like upstash-kv-camel-pendant", () => {
		expect(
			readRedisCredentials({
				KV_REST_API_URL: "https://kv.upstash.io",
				KV_REST_API_TOKEN: "token-b",
			}),
		).toEqual({
			url: "https://kv.upstash.io",
			token: "token-b",
		});
	});

	it("reads prefixed Marketplace names when a custom prefix was set", () => {
		expect(
			readRedisCredentials({
				CALLS_KV_REST_API_URL: "https://prefixed.upstash.io",
				CALLS_KV_REST_API_TOKEN: "token-c",
			}),
		).toEqual({
			url: "https://prefixed.upstash.io",
			token: "token-c",
		});
	});

	it("returns null when Redis is not configured", () => {
		expect(readRedisCredentials({})).toBeNull();
	});
});
