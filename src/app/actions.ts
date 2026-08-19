"use server";

import { revalidatePath } from "next/cache";
import {
	addBucketItem,
	addCall,
	addCheckIn,
	addThinking,
	answerTodayQuestion,
	removeBucketItem,
	removeLastCall,
	setTodayCallDuration,
	suggestQuestion,
	toggleBucketItem,
	updateStatus,
} from "@/lib/storage";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Wraps a storage mutation with path revalidation.
 */
async function runMutation(action: () => Promise<void>): Promise<ActionResult> {
	try {
		await action();
		revalidatePath("/");
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Something went wrong.",
		};
	}
}

/**
 * Logs one shared call happening right now.
 */
export async function logCall(durationMinutes?: number): Promise<ActionResult> {
	return runMutation(async () => {
		await addCall(new Date(), durationMinutes);
	});
}

/**
 * Saves how long today's call lasted.
 */
export async function saveTodayCallDuration(rawMinutes: string): Promise<ActionResult> {
	return runMutation(async () => {
		await setTodayCallDuration(rawMinutes);
	});
}

/**
 * Removes the most recent call, used for accidental taps.
 */
export async function undoCall(): Promise<ActionResult> {
	return runMutation(async () => {
		await removeLastCall();
	});
}

/**
 * Saves a named "I was here" note with an automatic timestamp.
 */
export async function leaveCheckIn(name: string, message: string): Promise<ActionResult> {
	return runMutation(async () => {
		await addCheckIn(name, message);
	});
}

/**
 * Updates one person's current status fields.
 */
export async function saveStatus(
	name: string,
	listeningTo: string,
	location: string,
	doing: string,
): Promise<ActionResult> {
	return runMutation(async () => {
		await updateStatus(name, listeningTo, location, doing);
	});
}

/**
 * Sends a thinking-of-you ping.
 */
export async function sendThinking(from: string): Promise<ActionResult> {
	return runMutation(async () => {
		await addThinking(from);
	});
}

/**
 * Adds a suggested question to the daily bank.
 */
export async function addQuestionToBank(
	text: string,
	suggestedBy: string,
): Promise<ActionResult> {
	return runMutation(async () => {
		await suggestQuestion(text, suggestedBy);
	});
}

/**
 * Saves one person's answer to today's question.
 */
export async function saveQuestionAnswer(name: string, answer: string): Promise<ActionResult> {
	return runMutation(async () => {
		await answerTodayQuestion(name, answer);
	});
}

/**
 * Adds one open bucket-list item.
 */
export async function createBucketItem(text: string, addedBy: string): Promise<ActionResult> {
	return runMutation(async () => {
		await addBucketItem(text, addedBy);
	});
}

/**
 * Marks a bucket item done or reopens it.
 */
export async function setBucketItemDone(
	id: string,
	done: boolean,
	actor: string,
): Promise<ActionResult> {
	return runMutation(async () => {
		await toggleBucketItem(id, done, actor);
	});
}

/**
 * Deletes one bucket-list item.
 */
export async function deleteBucketItem(id: string): Promise<ActionResult> {
	return runMutation(async () => {
		await removeBucketItem(id);
	});
}
