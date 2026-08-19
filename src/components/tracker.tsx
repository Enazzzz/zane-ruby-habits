"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { leaveCheckIn, logCall, undoCall } from "@/app/actions";
import { latestCheckInByName, MAX_CHECKIN_MESSAGE, MAX_CHECKIN_NAME } from "@/lib/checkins";
import { PEOPLE } from "@/lib/config";
import { formatCallTime } from "@/lib/dates";
import type { CheckInRecord, TrackerSnapshot } from "@/lib/types";

const SAVED_NAME_KEY = "zane-ruby:checkin-name";

type TrackerProps = {
	snapshot: TrackerSnapshot;
	checkIns: CheckInRecord[];
};

/**
 * Interactive board for logging one shared call a day and reading the streak.
 */
export function Tracker({ snapshot, checkIns }: TrackerProps) {
	const router = useRouter();
	const [callPending, startCall] = useTransition();
	const [checkInPending, startCheckIn] = useTransition();
	const [callError, setCallError] = useState<string | null>(null);
	const [checkInError, setCheckInError] = useState<string | null>(null);
	const storedName = useSyncExternalStore(
		subscribeSavedName,
		readSavedName,
		() => "",
	);
	const [visitorName, setVisitorName] = useState<string | null>(null);
	const [note, setNote] = useState("");
	const names = snapshot.people.join(" & ");
	const lastCall = snapshot.calls[0];
	const alreadyToday = snapshot.calledToday;
	const latestVisits = latestCheckInByName(checkIns);
	const busy = callPending || checkInPending;
	const nameValue = visitorName ?? storedName;

	/**
	 * Runs a server action then refreshes the snapshot.
	 */
	function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
		setCallError(null);
		startCall(async () => {
			const result = await action();
			if (!result.ok) {
				setCallError(result.error);
				return;
			}
			router.refresh();
		});
	}

	/**
	 * Posts a named check-in, remembers the name locally, and clears the note.
	 */
	function submitCheckIn() {
		setCheckInError(null);
		startCheckIn(async () => {
			const result = await leaveCheckIn(nameValue, note);
			if (!result.ok) {
				setCheckInError(result.error);
				return;
			}
			const trimmed = nameValue.trim();
			try {
				window.localStorage.setItem(SAVED_NAME_KEY, trimmed);
			} catch {
				// Ignoring storage errors keeps the shared log as the source of truth.
			}
			setVisitorName(trimmed);
			setNote("");
			router.refresh();
		});
	}

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-10 pt-8">
			<header className="mb-8 text-center">
				<p className="text-sm font-extrabold uppercase tracking-[0.22em] text-mute">
					Daily calls
				</p>
				<h1 className="mt-2 text-4xl font-black tracking-tight">{names}</h1>
				<p className="mt-2 text-mute">
					Once a day. Five days a week. Two grace days.
				</p>
			</header>

			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<div className="flex items-end justify-between gap-4">
					<div>
						<p className="text-sm font-extrabold uppercase tracking-widest text-mute">
							Streak
						</p>
						<p className="mt-1 text-6xl font-black leading-none text-flame">
							{snapshot.streak}
						</p>
						<p className="mt-2 font-extrabold text-snow">day streak</p>
					</div>
					<FlameIcon lit={snapshot.streak > 0} />
				</div>
				<dl className="mt-5 grid grid-cols-2 gap-3">
					<div className="rounded-2xl bg-panel-2 px-4 py-3">
						<dt className="text-xs font-extrabold uppercase tracking-widest text-mute">
							All time
						</dt>
						<dd className="mt-1 text-2xl font-black">
							{snapshot.totalCalls}
							<span className="ml-1 text-sm font-extrabold text-mute">
								{snapshot.totalCalls === 1 ? "call" : "calls"}
							</span>
						</dd>
					</div>
					<div className="rounded-2xl bg-panel-2 px-4 py-3">
						<dt className="text-xs font-extrabold uppercase tracking-widest text-mute">
							Best
						</dt>
						<dd className="mt-1 text-2xl font-black">
							{snapshot.bestStreak}
							<span className="ml-1 text-sm font-extrabold text-mute">
								{snapshot.bestStreak === 1 ? "day" : "days"}
							</span>
						</dd>
					</div>
				</dl>
			</section>

			<section className="mt-5 overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<div className="flex items-baseline justify-between">
					<h2 className="text-xl font-black">This week</h2>
					<p className="font-black text-duo">
						{snapshot.currentCount}/{snapshot.goal}
					</p>
				</div>
				<p className="mt-1 font-bold text-mute">
					{weekStatusCopy(snapshot)}
				</p>
				<ol className="mt-4 flex gap-2">
					{Array.from({ length: 7 }, (_, index) => {
						const day = snapshot.days[index];
						const filled = Boolean(day && day.count > 0);
						return (
							<li
								key={day?.date ?? index}
								className={`h-3 flex-1 rounded-full ${filled ? "bg-duo pop-in" : "bg-line"}`}
							/>
						);
					})}
				</ol>
				<ol className="mt-5 grid grid-cols-7 gap-2">
					{snapshot.days.map((day) => (
						<li key={day.date} className="flex flex-col items-center gap-2">
							<span
								className={`text-xs font-extrabold ${day.isToday ? "text-duo" : "text-mute"}`}
							>
								{day.label}
							</span>
							<span
								className={[
									"flex h-11 w-11 items-center justify-center rounded-full text-sm font-black",
									day.count > 0
										? "bg-duo text-ink"
										: day.isToday
											? "border-2 border-duo bg-panel-2 text-snow"
											: "border-2 border-line bg-panel-2 text-mute",
								].join(" ")}
							>
								{day.count > 0 ? "✓" : day.isFuture ? "" : "–"}
							</span>
						</li>
					))}
				</ol>
				<p className="mt-4 text-center text-sm font-bold text-mute">
					{snapshot.graceRemaining} grace{" "}
					{snapshot.graceRemaining === 1 ? "day" : "days"} left this week
				</p>
			</section>

			<div className="mt-8 flex flex-col gap-3">
				<button
					type="button"
					disabled={busy || alreadyToday}
					onClick={() => run(logCall)}
					className="duo-press h-16 rounded-[18px] bg-duo text-2xl font-black text-ink disabled:bg-line disabled:text-mute"
				>
					{callPending ? "Saving…" : alreadyToday ? "Called today" : "We called"}
				</button>
				<button
					type="button"
					disabled={busy || snapshot.calls.length === 0}
					onClick={() => run(undoCall)}
					className="h-12 rounded-[18px] border-2 border-line bg-transparent text-base font-extrabold text-mute disabled:opacity-40"
				>
					Undo last call
				</button>
			</div>

			{callError ? (
				<p className="mt-4 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
					{callError}
				</p>
			) : null}

			{snapshot.storage === "missing" ? (
				<p className="mt-4 rounded-2xl bg-panel-2 px-4 py-3 text-center text-sm font-bold text-mute">
					This deploy cannot see Redis yet. On the Upstash store, connect this
					project, then Redeploy so KV_REST_API_URL lands in production.
				</p>
			) : null}

			{lastCall ? (
				<p className="mt-5 text-center text-sm font-bold text-mute">
					Last call · {formatCallTime(lastCall.at, snapshot.timezone)}
				</p>
			) : (
				<p className="mt-5 text-center text-sm font-bold text-mute">
					No calls yet. Tap when you hang up.
				</p>
			)}

			<section className="mt-8">
				<h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-mute">
					Recent weeks
				</h2>
				<ul className="mt-3 space-y-2">
					{snapshot.recentWeeks.map((week) => (
						<li
							key={week.weekId}
							className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3"
						>
							<div>
								<p className="font-extrabold">
									{week.label}
									{week.isCurrent ? " · now" : ""}
								</p>
								<p className="text-sm font-bold text-mute">
									{week.count} {week.count === 1 ? "day" : "days"}
								</p>
							</div>
							<span
								className={`rounded-full px-3 py-1 text-sm font-black ${
									week.met
										? "bg-[#1d3a16] text-duo"
										: week.isCurrent
											? "bg-panel-2 text-mute"
											: "bg-[#3a1f1f] text-miss"
								}`}
							>
								{week.met ? "Safe" : week.isCurrent ? "Open" : "Broke"}
							</span>
						</li>
					))}
				</ul>
			</section>

			<section className="mt-8 overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<h2 className="text-xl font-black">Last here</h2>
				<p className="mt-1 font-bold text-mute">
					Leave a name and a tiny note so the other person knows you stopped by.
				</p>
				{latestVisits.length === 0 ? (
					<p className="mt-4 rounded-2xl bg-panel-2 px-4 py-3 text-sm font-bold text-mute">
						Nobody has checked in yet.
					</p>
				) : (
					<ul className="mt-4 space-y-2">
						{latestVisits.map((visit) => (
							<li key={visit.id} className="rounded-2xl bg-panel-2 px-4 py-3">
								<div className="flex items-baseline justify-between gap-3">
									<p className="font-black">{visit.name}</p>
									<p className="text-xs font-extrabold text-mute">
										{formatCallTime(visit.at, snapshot.timezone)}
									</p>
								</div>
								<p className="mt-1 text-sm font-bold text-mute">
									{visit.message || "was here"}
								</p>
							</li>
						))}
					</ul>
				)}
				<form
					className="mt-4 flex flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						submitCheckIn();
					}}
				>
					<div className="flex gap-2">
						{PEOPLE.map((person) => {
							const selected = nameValue.trim().toLowerCase() === person.toLowerCase();
							return (
								<button
									key={person}
									type="button"
									disabled={busy}
									onClick={() => setVisitorName(person)}
									className={`h-10 flex-1 rounded-full text-sm font-black ${
										selected
											? "bg-duo text-ink"
											: "border-2 border-line bg-transparent text-mute"
									}`}
								>
									{person}
								</button>
							);
						})}
					</div>
					<label className="sr-only" htmlFor="check-in-name">
						Your name
					</label>
					<input
						id="check-in-name"
						value={nameValue}
						onChange={(event) => setVisitorName(event.target.value)}
						maxLength={MAX_CHECKIN_NAME}
						placeholder="Your name"
						autoComplete="name"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<label className="sr-only" htmlFor="check-in-note">
						A small message
					</label>
					<input
						id="check-in-note"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						maxLength={MAX_CHECKIN_MESSAGE}
						placeholder="A small message"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<button
						type="submit"
						disabled={busy || nameValue.trim().length === 0}
						className="duo-press h-14 rounded-[18px] bg-duo text-lg font-black text-ink disabled:bg-line disabled:text-mute"
					>
						{checkInPending ? "Saving…" : "I'm here"}
					</button>
				</form>
				{checkInError ? (
					<p className="mt-3 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
						{checkInError}
					</p>
				) : null}
			</section>

			<p className="mt-auto pt-8 text-center text-xs font-bold text-line">
				Weeks start Monday in {snapshot.timezone.replace("_", " ")}. Need 5
				days. Two grace misses.
			</p>
		</main>
	);
}

/**
 * Reads the last check-in name this browser saved, if any.
 */
function readSavedName(): string {
	try {
		return window.localStorage.getItem(SAVED_NAME_KEY) ?? "";
	} catch {
		return "";
	}
}

/**
 * Re-reads the saved name when another tab updates localStorage.
 */
function subscribeSavedName(onStoreChange: () => void): () => void {
	window.addEventListener("storage", onStoreChange);
	return () => window.removeEventListener("storage", onStoreChange);
}

/**
 * Status line for the current week toward the five-day floor.
 */
function weekStatusCopy(snapshot: TrackerSnapshot): string {
	if (snapshot.goalMet) {
		return "Week is safe. Extra days still count.";
	}
	if (snapshot.remaining === 1) {
		return "One more day this week to keep the streak.";
	}
	return `${snapshot.remaining} more days this week to keep the streak.`;
}

/**
 * Streak flame that lights up once a day streak is alive.
 */
function FlameIcon({ lit }: { lit: boolean }) {
	return (
		<div
			aria-hidden="true"
			className={`flex h-24 w-24 items-center justify-center rounded-[28px] text-6xl ${
				lit ? "bg-[#3a2a12]" : "bg-panel-2 grayscale opacity-45"
			}`}
		>
			🔥
		</div>
	);
}
