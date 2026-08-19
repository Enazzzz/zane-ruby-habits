"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logCall, saveTodayCallDuration, undoCall } from "@/app/actions";
import { formatTalkMinutes } from "@/lib/duration";
import { formatCallTime } from "@/lib/dates";
import type { TrackerSnapshot } from "@/lib/types";

type CallsPanelProps = {
	snapshot: TrackerSnapshot;
};

/**
 * Streak board, weekly progress, and call logging with optional duration.
 */
export function CallsPanel({ snapshot }: CallsPanelProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [duration, setDuration] = useState("");
	const lastCall = snapshot.calls[0];
	const alreadyToday = snapshot.calledToday;

	/**
	 * Runs a call action and refreshes the board.
	 */
	function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
		setError(null);
		startTransition(async () => {
			const result = await action();
			if (!result.ok) {
				setError(result.error);
				return;
			}
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-5">
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
								{snapshot.totalCalls === 1 ? "day" : "days"}
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
					<div className="rounded-2xl bg-panel-2 px-4 py-3">
						<dt className="text-xs font-extrabold uppercase tracking-widest text-mute">
							Talk time
						</dt>
						<dd className="mt-1 text-2xl font-black">
							{formatTalkMinutes(snapshot.totalTalkMinutes)}
						</dd>
					</div>
					<div className="rounded-2xl bg-panel-2 px-4 py-3">
						<dt className="text-xs font-extrabold uppercase tracking-widest text-mute">
							Today
						</dt>
						<dd className="mt-1 text-2xl font-black">
							{snapshot.todayDurationMinutes
								? formatTalkMinutes(snapshot.todayDurationMinutes)
								: "—"}
						</dd>
					</div>
				</dl>
			</section>

			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<div className="flex items-baseline justify-between">
					<h2 className="text-xl font-black">This week</h2>
					<p className="font-black text-duo">
						{snapshot.currentCount}/{snapshot.goal}
					</p>
				</div>
				<p className="mt-1 font-bold text-mute">{weekStatusCopy(snapshot)}</p>
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

			<div className="flex flex-col gap-3">
				<label className="sr-only" htmlFor="call-duration">
					Call length in minutes
				</label>
				<input
					id="call-duration"
					value={duration}
					onChange={(event) => setDuration(event.target.value)}
					inputMode="numeric"
					placeholder="Call length in minutes (optional)"
					className="h-12 rounded-[18px] border-2 border-line bg-panel px-4 font-extrabold text-snow placeholder:text-mute"
				/>
				<button
					type="button"
					disabled={pending || alreadyToday}
					onClick={() =>
						run(async () =>
							logCall(duration.trim() ? Number.parseInt(duration.trim(), 10) : undefined),
						)
					}
					className="duo-press h-16 rounded-[18px] bg-duo text-2xl font-black text-ink disabled:bg-line disabled:text-mute"
				>
					{pending ? "Saving…" : alreadyToday ? "Called today" : "We called"}
				</button>
				{alreadyToday ? (
					<button
						type="button"
						disabled={pending || duration.trim().length === 0}
						onClick={() => run(async () => saveTodayCallDuration(duration))}
						className="h-12 rounded-[18px] border-2 border-duo bg-transparent text-base font-extrabold text-duo disabled:opacity-40"
					>
						Save call length for today
					</button>
				) : null}
				<button
					type="button"
					disabled={pending || snapshot.calls.length === 0}
					onClick={() => run(undoCall)}
					className="h-12 rounded-[18px] border-2 border-line bg-transparent text-base font-extrabold text-mute disabled:opacity-40"
				>
					Undo last call
				</button>
			</div>

			{error ? (
				<p className="rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
					{error}
				</p>
			) : null}

			{snapshot.storage === "missing" ? (
				<p className="rounded-2xl bg-panel-2 px-4 py-3 text-center text-sm font-bold text-mute">
					This deploy cannot see Redis yet. Connect the Upstash store, then redeploy.
				</p>
			) : null}

			{lastCall ? (
				<p className="text-center text-sm font-bold text-mute">
					Last call · {formatCallTime(lastCall.at, snapshot.timezone)}
					{lastCall.durationMinutes
						? ` · ${formatTalkMinutes(lastCall.durationMinutes)}`
						: ""}
				</p>
			) : (
				<p className="text-center text-sm font-bold text-mute">
					No calls yet. Tap when you hang up.
				</p>
			)}

			<section>
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
		</div>
	);
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
