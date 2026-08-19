"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	addQuestionToBank,
	createBucketItem,
	deleteBucketItem,
	saveQuestionAnswer,
	setBucketItemDone,
} from "@/app/actions";
import { MAX_ANSWER_TEXT, MAX_QUESTION_TEXT } from "@/lib/questions";
import { MAX_BUCKET_TEXT } from "@/lib/bucket";
import { PEOPLE } from "@/lib/config";
import type { BucketItem, DailyQuestionRecord } from "@/lib/types";
import {
	finalizeName,
	PersonPicker,
	rememberSavedName,
	resolveName,
	useSavedName,
} from "@/components/person-picker";

type PlayPanelProps = {
	todayQuestion: DailyQuestionRecord | null;
	questionBankCount: number;
	bucket: BucketItem[];
};

/**
 * Daily question bank and the shared bucket list.
 */
export function PlayPanel({ todayQuestion, questionBankCount, bucket }: PlayPanelProps) {
	const router = useRouter();
	const [storedName, rememberName] = useSavedName();
	const [editedName, setEditedName] = useState<string | null>(null);
	const [answer, setAnswer] = useState("");
	const [suggestedQuestion, setSuggestedQuestion] = useState("");
	const [bucketText, setBucketText] = useState("");
	const [questionError, setQuestionError] = useState<string | null>(null);
	const [bucketError, setBucketError] = useState<string | null>(null);
	const [questionPending, startQuestion] = useTransition();
	const [bucketPending, startBucket] = useTransition();
	const nameValue = resolveName(editedName, storedName);

	/**
	 * Saves one answer to today's question.
	 */
	function submitAnswer() {
		setQuestionError(null);
		startQuestion(async () => {
			const result = await saveQuestionAnswer(nameValue, answer);
			if (!result.ok) {
				setQuestionError(result.error);
				return;
			}
			const trimmed = finalizeName(nameValue);
			rememberSavedName(trimmed);
			rememberName(trimmed);
			setEditedName(trimmed);
			setAnswer("");
			router.refresh();
		});
	}

	/**
	 * Adds a suggested question to the bank.
	 */
	function submitSuggestion() {
		setQuestionError(null);
		startQuestion(async () => {
			const result = await addQuestionToBank(suggestedQuestion, nameValue);
			if (!result.ok) {
				setQuestionError(result.error);
				return;
			}
			const trimmed = finalizeName(nameValue);
			rememberSavedName(trimmed);
			rememberName(trimmed);
			setEditedName(trimmed);
			setSuggestedQuestion("");
			router.refresh();
		});
	}

	/**
	 * Adds one open bucket-list item.
	 */
	function submitBucketItem() {
		setBucketError(null);
		startBucket(async () => {
			const result = await createBucketItem(bucketText, nameValue);
			if (!result.ok) {
				setBucketError(result.error);
				return;
			}
			const trimmed = finalizeName(nameValue);
			rememberSavedName(trimmed);
			rememberName(trimmed);
			setEditedName(trimmed);
			setBucketText("");
			router.refresh();
		});
	}

	/**
	 * Marks a bucket item done or reopens it.
	 */
	function toggleItem(item: BucketItem) {
		setBucketError(null);
		startBucket(async () => {
			const result = await setBucketItemDone(item.id, !item.done, nameValue);
			if (!result.ok) {
				setBucketError(result.error);
				return;
			}
			router.refresh();
		});
	}

	/**
	 * Deletes one bucket item permanently.
	 */
	function removeItem(id: string) {
		setBucketError(null);
		startBucket(async () => {
			const result = await deleteBucketItem(id);
			if (!result.ok) {
				setBucketError(result.error);
				return;
			}
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<h2 className="text-xl font-black">Question of the day</h2>
				<p className="mt-1 font-bold text-mute">
					{questionBankCount} waiting in the bank. A new one is picked each day and
					removed from the bank.
				</p>
				{todayQuestion ? (
					<div className="mt-4 rounded-2xl bg-panel-2 px-4 py-4">
						<p className="text-lg font-black text-snow">{todayQuestion.text}</p>
						<ul className="mt-4 space-y-2">
							{PEOPLE.map((person) => {
								const entry = Object.entries(todayQuestion.answers).find(
									([name]) => name.toLowerCase() === person.toLowerCase(),
								)?.[1];
								return (
									<li key={person} className="rounded-2xl bg-panel px-3 py-3">
										<p className="font-black">{person}</p>
										<p className="mt-1 text-sm font-bold text-mute">
											{entry?.text ?? "Not answered yet."}
										</p>
									</li>
								);
							})}
						</ul>
					</div>
				) : (
					<p className="mt-4 rounded-2xl bg-panel-2 px-4 py-3 text-sm font-bold text-mute">
						The bank is empty. Suggest the first question below.
					</p>
				)}

				<div className="mt-4 flex flex-col gap-3">
					<PersonPicker
						value={nameValue}
						onChange={setEditedName}
						disabled={questionPending || bucketPending}
					/>
					<input
						value={nameValue}
						onChange={(event) => setEditedName(event.target.value)}
						placeholder="Your name"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					{todayQuestion ? (
						<>
							<input
								value={answer}
								onChange={(event) => setAnswer(event.target.value)}
								maxLength={MAX_ANSWER_TEXT}
								placeholder="Your answer"
								className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
							/>
							<button
								type="button"
								disabled={questionPending || nameValue.trim().length === 0 || answer.trim().length === 0}
								onClick={submitAnswer}
								className="duo-press h-14 rounded-[18px] bg-duo text-lg font-black text-ink disabled:bg-line disabled:text-mute"
							>
								{questionPending ? "Saving…" : "Save answer"}
							</button>
						</>
					) : null}
					<input
						value={suggestedQuestion}
						onChange={(event) => setSuggestedQuestion(event.target.value)}
						maxLength={MAX_QUESTION_TEXT}
						placeholder="Suggest a question for the bank"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<button
						type="button"
						disabled={
							questionPending ||
							nameValue.trim().length === 0 ||
							suggestedQuestion.trim().length === 0
						}
						onClick={submitSuggestion}
						className="h-12 rounded-[18px] border-2 border-duo bg-transparent text-base font-extrabold text-duo disabled:opacity-40"
					>
						{questionPending ? "Saving…" : "Add to bank"}
					</button>
				</div>
				{questionError ? (
					<p className="mt-3 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
						{questionError}
					</p>
				) : null}
			</section>

			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<h2 className="text-xl font-black">Bucket list</h2>
				<p className="mt-1 font-bold text-mute">
					Shared things to do, watch, eat, or chase together.
				</p>
				{bucket.length === 0 ? (
					<p className="mt-4 rounded-2xl bg-panel-2 px-4 py-3 text-sm font-bold text-mute">
						Nothing on the list yet.
					</p>
				) : (
					<ul className="mt-4 space-y-2">
						{bucket.map((item) => (
							<li key={item.id} className="rounded-2xl bg-panel-2 px-4 py-3">
								<div className="flex items-start gap-3">
									<button
										type="button"
										disabled={bucketPending || nameValue.trim().length === 0}
										onClick={() => toggleItem(item)}
										className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
											item.done
												? "border-duo bg-duo text-ink"
												: "border-line bg-panel text-transparent"
										}`}
									>
										✓
									</button>
									<div className="min-w-0 flex-1">
										<p
											className={`font-extrabold ${item.done ? "text-mute line-through" : "text-snow"}`}
										>
											{item.text}
										</p>
										<p className="mt-1 text-xs font-bold text-mute">
											Added by {item.addedBy}
											{item.done && item.doneBy ? ` · done by ${item.doneBy}` : ""}
										</p>
									</div>
									<button
										type="button"
										disabled={bucketPending}
										onClick={() => removeItem(item.id)}
										className="text-xs font-extrabold text-miss"
									>
										Delete
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
				<div className="mt-4 flex flex-col gap-3">
					<input
						value={bucketText}
						onChange={(event) => setBucketText(event.target.value)}
						maxLength={MAX_BUCKET_TEXT}
						placeholder="Add something to the bucket"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<button
						type="button"
						disabled={
							bucketPending ||
							nameValue.trim().length === 0 ||
							bucketText.trim().length === 0
						}
						onClick={submitBucketItem}
						className="duo-press h-14 rounded-[18px] bg-duo text-lg font-black text-ink disabled:bg-line disabled:text-mute"
					>
						{bucketPending ? "Saving…" : "Add to bucket"}
					</button>
				</div>
				{bucketError ? (
					<p className="mt-3 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
						{bucketError}
					</p>
				) : null}
			</section>
		</div>
	);
}
