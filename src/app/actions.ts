"use server";

import { revalidatePath } from "next/cache";
import { addCall, removeLastCall } from "@/lib/storage";

/**
 * Logs one shared call happening right now.
 */
export async function logCall(): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		await addCall();
		revalidatePath("/");
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Could not log that call.",
		};
	}
}

/**
 * Removes the most recent call, used for accidental taps.
 */
export async function undoCall(): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		await removeLastCall();
		revalidatePath("/");
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Could not undo that call.",
		};
	}
}
