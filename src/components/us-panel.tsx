"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { leaveCheckIn, saveStatus, sendThinking } from "@/app/actions";
import { latestCheckInByName } from "@/lib/checkins";
import { PEOPLE } from "@/lib/config";
import { formatCallTime } from "@/lib/dates";
import { MAX_STATUS_FIELD } from "@/lib/status";
import { MAX_CHECKIN_MESSAGE, MAX_CHECKIN_NAME } from "@/lib/checkins";
import type {
	CheckInRecord,
	StatusRecord,
	ThinkingStats,
	TrackerSnapshot,
} from "@/lib/types";
import {
	finalizeName,
	PersonPicker,
	rememberSavedName,
	resolveName,
	useSavedName,
} from "@/components/person-picker";

type UsPanelProps = {
	snapshot: TrackerSnapshot;
	checkIns: CheckInRecord[];
	statuses: StatusRecord[];
	thinkingStats: ThinkingStats;
};

/**
 * Status cards, thinking-of-you pings, and last-here notes.
 */
export function UsPanel({ snapshot, checkIns, statuses, thinkingStats }: UsPanelProps) {
	const router = useRouter();
	const [storedName, rememberName] = useSavedName();
	const [editedName, setEditedName] = useState<string | null>(null);
	const [note, setNote] = useState("");
	const [checkInError, setCheckInError] = useState<string | null>(null);
	const [thinkingError, setThinkingError] = useState<string | null>(null);
	const [checkInPending, startCheckIn] = useTransition();
	const [thinkingPending, startThinking] = useTransition();
	const nameValue = resolveName(editedName, storedName);
	const latestVisits = latestCheckInByName(checkIns);
	const statusByName = new Map(
		statuses.map((status) => [status.name.toLowerCase(), status]),
	);

	/**
	 * Posts a check-in and remembers the chosen name locally.
	 */
	function submitCheckIn() {
		setCheckInError(null);
		startCheckIn(async () => {
			const result = await leaveCheckIn(nameValue, note);
			if (!result.ok) {
				setCheckInError(result.error);
				return;
			}
			const trimmed = finalizeName(nameValue);
			rememberSavedName(trimmed);
			rememberName(trimmed);
			setEditedName(trimmed);
			setNote("");
			router.refresh();
		});
	}

	/**
	 * Sends a thinking-of-you ping from the chosen name.
	 */
	function submitThinking() {
		setThinkingError(null);
		startThinking(async () => {
			const result = await sendThinking(nameValue);
			if (!result.ok) {
				setThinkingError(result.error);
				return;
			}
			const trimmed = finalizeName(nameValue);
			rememberSavedName(trimmed);
			rememberName(trimmed);
			setEditedName(trimmed);
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<h2 className="text-xl font-black">Right now</h2>
				<p className="mt-1 font-bold text-mute">
					What you are listening to, where you are, and what you are up to.
				</p>
				<ul className="mt-4 space-y-3">
					{PEOPLE.map((person) => (
						<StatusCard
							key={`${person}-${statusByName.get(person.toLowerCase())?.at ?? "new"}`}
							person={person}
							status={statusByName.get(person.toLowerCase()) ?? null}
							timezone={snapshot.timezone}
						/>
					))}
				</ul>
			</section>

			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
				<h2 className="text-xl font-black">Thinking of you</h2>
				<p className="mt-1 font-bold text-mute">
					One tap when they cross your mind. Counts add up over time.
				</p>
				<ul className="mt-4 space-y-2">
					{PEOPLE.map((person) => {
						const other = PEOPLE.find((name) => name !== person) ?? "them";
						return (
							<li key={person} className="rounded-2xl bg-panel-2 px-4 py-3">
								<div className="flex items-baseline justify-between gap-3">
									<p className="font-black">{person}</p>
									<p className="text-xs font-extrabold text-mute">
										{thinkingStats.countByPerson[person] ?? 0} total
									</p>
								</div>
								<p className="mt-1 text-sm font-bold text-mute">
									{thinkingStats.lastByPerson[person]
										? `Last ping · ${formatCallTime(thinkingStats.lastByPerson[person]!, snapshot.timezone)}`
										: `Has not pinged ${other} yet.`}
								</p>
							</li>
						);
					})}
				</ul>
				<div className="mt-4 flex flex-col gap-3">
					<PersonPicker
						value={nameValue}
						onChange={setEditedName}
						disabled={thinkingPending || checkInPending}
					/>
					<input
						value={nameValue}
						onChange={(event) => setEditedName(event.target.value)}
						maxLength={MAX_CHECKIN_NAME}
						placeholder="Your name"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<button
						type="button"
						disabled={thinkingPending || nameValue.trim().length === 0}
						onClick={submitThinking}
						className="duo-press h-14 rounded-[18px] bg-[#ff4b7d] text-lg font-black text-white disabled:bg-line disabled:text-mute"
					>
						{thinkingPending ? "Sending…" : "Thinking of you 💭"}
					</button>
				</div>
				{thinkingError ? (
					<p className="mt-3 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center font-bold text-miss">
						{thinkingError}
					</p>
				) : null}
			</section>

			<section className="overflow-hidden rounded-[28px] bg-panel p-5 shadow-[0_8px_0_#152226]">
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
					<input
						value={note}
						onChange={(event) => setNote(event.target.value)}
						maxLength={MAX_CHECKIN_MESSAGE}
						placeholder="A small message"
						className="h-12 rounded-[18px] border-2 border-line bg-panel-2 px-4 font-extrabold text-snow placeholder:text-mute"
					/>
					<button
						type="submit"
						disabled={checkInPending || nameValue.trim().length === 0}
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
		</div>
	);
}

type StatusCardProps = {
	person: string;
	status: StatusRecord | null;
	timezone: string;
};

/**
 * Shows and edits one person's three-field status.
 */
function StatusCard({ person, status, timezone }: StatusCardProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [listeningTo, setListeningTo] = useState(status?.listeningTo ?? "");
	const [location, setLocation] = useState(status?.location ?? "");
	const [doing, setDoing] = useState(status?.doing ?? "");

	/**
	 * Saves the three status fields for this person.
	 */
	function submitStatus() {
		setError(null);
		startTransition(async () => {
			const result = await saveStatus(person, listeningTo, location, doing);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			router.refresh();
		});
	}

	return (
		<li className="rounded-2xl bg-panel-2 p-4">
			<div className="flex items-baseline justify-between gap-3">
				<p className="font-black">{person}</p>
				{status ? (
					<p className="text-xs font-extrabold text-mute">
						{formatCallTime(status.at, timezone)}
					</p>
				) : null}
			</div>
			{status ? (
				<dl className="mt-3 space-y-2 text-sm font-bold text-mute">
					<div>
						<dt className="text-xs font-extrabold uppercase tracking-widest text-line">
							Listening to
						</dt>
						<dd className="mt-1 text-snow">{status.listeningTo || "—"}</dd>
					</div>
					<div>
						<dt className="text-xs font-extrabold uppercase tracking-widest text-line">
							Location
						</dt>
						<dd className="mt-1 text-snow">{status.location || "—"}</dd>
					</div>
					<div>
						<dt className="text-xs font-extrabold uppercase tracking-widest text-line">
							Doing
						</dt>
						<dd className="mt-1 text-snow">{status.doing || "—"}</dd>
					</div>
				</dl>
			) : (
				<p className="mt-3 text-sm font-bold text-mute">No status yet.</p>
			)}
			<div className="mt-4 flex flex-col gap-2">
				<input
					value={listeningTo}
					onChange={(event) => setListeningTo(event.target.value)}
					maxLength={MAX_STATUS_FIELD}
					placeholder="Listening to"
					className="h-11 rounded-[16px] border-2 border-line bg-panel px-3 font-extrabold text-snow placeholder:text-mute"
				/>
				<input
					value={location}
					onChange={(event) => setLocation(event.target.value)}
					maxLength={MAX_STATUS_FIELD}
					placeholder="Location"
					className="h-11 rounded-[16px] border-2 border-line bg-panel px-3 font-extrabold text-snow placeholder:text-mute"
				/>
				<input
					value={doing}
					onChange={(event) => setDoing(event.target.value)}
					maxLength={MAX_STATUS_FIELD}
					placeholder="Doing"
					className="h-11 rounded-[16px] border-2 border-line bg-panel px-3 font-extrabold text-snow placeholder:text-mute"
				/>
				<button
					type="button"
					disabled={pending}
					onClick={submitStatus}
					className="h-11 rounded-[16px] bg-duo text-sm font-black text-ink disabled:bg-line disabled:text-mute"
				>
					{pending ? "Saving…" : `Update ${person}`}
				</button>
			</div>
			{error ? (
				<p className="mt-3 rounded-2xl bg-[#3a1f1f] px-4 py-3 text-center text-sm font-bold text-miss">
					{error}
				</p>
			) : null}
		</li>
	);
}
