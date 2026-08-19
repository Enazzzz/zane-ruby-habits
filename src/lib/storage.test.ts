import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addCall, addCheckIn, listCalls, listCheckIns, removeLastCall } from "./storage";

const FILE_PATH = path.join(process.cwd(), "data", "calls.json");

/**
 * Storage tests hit the real local JSON file, then restore emptiness.
 */
afterEach(async () => {
	await mkdir(path.dirname(FILE_PATH), { recursive: true });
	await writeFile(FILE_PATH, `${JSON.stringify({ calls: [] }, null, "\t")}\n`);
});

describe("file call log", () => {
	it("appends a call and can undo it", async () => {
		await rm(FILE_PATH, { force: true });
		expect(await listCalls()).toEqual([]);

		const recorded = await addCall(new Date("2026-08-19T18:00:00.000Z"));
		const listed = await listCalls();
		expect(listed).toHaveLength(1);
		expect(listed[0]?.id).toBe(recorded.id);
		expect(listed[0]?.at).toBe("2026-08-19T18:00:00.000Z");

		const undone = await removeLastCall();
		expect(undone?.id).toBe(recorded.id);
		expect(await listCalls()).toEqual([]);
	});

	it("saves a named check-in with a timestamp", async () => {
		await rm(FILE_PATH, { force: true });
		expect(await listCheckIns()).toEqual([]);

		const recorded = await addCheckIn(
			"Zane",
			"just checking",
			new Date("2026-08-19T19:00:00.000Z"),
		);
		const listed = await listCheckIns();
		expect(listed).toHaveLength(1);
		expect(listed[0]).toMatchObject({
			id: recorded.id,
			name: "Zane",
			message: "just checking",
			at: "2026-08-19T19:00:00.000Z",
		});
	});
});
