"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logCall, undoCall } from "@/app/actions";
import { formatCallTime } from "@/lib/dates";
import type { TrackerSnapshot } from "@/lib/types";

type TrackerProps = {
	snapshot: TrackerSnapshot;
};

/**
 * Interactive board for logging shared calls and reading the weekly streak.
 */
export function Tracker({ snapshot }: TrackerProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const names = snapshot.people.join(" & ");
	const lastCall = snapshot.calls[0];

	/**
	 * Runs a server action then refreshes the snapshot.
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
		<main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-10 pt-8">
			<header className="mb-8 text-center">
				<p className="text-sm font-extrabold uppercase tracking-[0.22em] text-mute">
					Weekly calls
				</p>
				<h1 className="mt-2 text-4xl font-black tracking-tight">{names}</h1>
				<p className="mt-2 text-mute">Five times a week. See how long you last.</p>
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
						<p className="mt-2 font-extrabold text-snow">week streak</p>
					</div>
					<FlameIcon lit={snapshot.streak > 0} />
				</div>
				<p className="mt-4 text-sm font-bold text-mute">
					Best · {snapshot.bestStreak} {snapshot.bestStreak === 1 ? "week" : "weeks"}
				</p>
			</section>

			<section className="mt-5 overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<div className="flex items-baseline justify-between">
					<h2 className="text-xl font-black">This week</h2>
					<p className="font-black text-duo">
						{snapshot.currentCount}/{snapshot.goal}
					</p>
				</div>
				<p className="mt-1 font-bold text-mute">
					{snapshot.goalMet
						? "Week locked in. Keep going if you want."
						: snapshot.remaining === 1
							? "One more call and this week counts."
							: `${snapshot.remaining} calls left to keep the streak.`}
				</p>
				<ol className="mt-4 flex gap-2">
					{Array.from({ length: snapshot.goal }, (_, index) => {
						const filled = index < snapshot.currentCount;
						return (
							<li
								key={index}
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
								{day.count > 0 ? day.count : day.isFuture ? "" : "–"}
							</span>
						</li>
					))}
				</ol>
			</section>

			<div className="mt-8 flex flex-col gap-3">
				<button
					type="button"
					disabled={pending}
					onClick={() => run(logCall)}
					className="duo-press h-16 rounded-[18px] bg-duo text-2xl font-black text-ink disabled:bg-line disabled:text-mute"
				>
					{pending ? "Saving…" : "We called"}
				</button>
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
				<p className="mt-4 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
					{error}
				</p>
			) : null}

			{snapshot.storage === "missing" ? (
				<p className="mt-4 rounded-2xl bg-panel-2 px-4 py-3 text-center text-sm font-bold text-mute">
					Connect Upstash Redis in Vercel so this log survives deploys.
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
									{week.count}/{snapshot.goal}
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
								{week.met ? "Hit" : week.isCurrent ? "Open" : "Miss"}
							</span>
						</li>
					))}
				</ul>
			</section>

			<p className="mt-auto pt-8 text-center text-xs font-bold text-line">
				Weeks start Monday in {snapshot.timezone.replace("_", " ")}.
			</p>
		</main>
	);
}

/**
 * Streak flame that lights up once a week has been secured.
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
