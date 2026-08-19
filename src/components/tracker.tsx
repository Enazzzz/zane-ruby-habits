"use client";

import { useState } from "react";
import { CallsPanel } from "@/components/calls-panel";
import { PlayPanel } from "@/components/play-panel";
import { TrackerTabs, type TrackerTab } from "@/components/tracker-tabs";
import { UsPanel } from "@/components/us-panel";
import type {
	BucketItem,
	CheckInRecord,
	DailyQuestionRecord,
	StatusRecord,
	ThinkingStats,
	TrackerSnapshot,
} from "@/lib/types";

type TrackerProps = {
	snapshot: TrackerSnapshot;
	checkIns: CheckInRecord[];
	statuses: StatusRecord[];
	thinkingStats: ThinkingStats;
	todayQuestion: DailyQuestionRecord | null;
	questionBankCount: number;
	bucket: BucketItem[];
};

/**
 * Tabbed home for calls, shared presence, and play-together lists.
 */
export function Tracker({
	snapshot,
	checkIns,
	statuses,
	thinkingStats,
	todayQuestion,
	questionBankCount,
	bucket,
}: TrackerProps) {
	const [tab, setTab] = useState<TrackerTab>("calls");
	const names = snapshot.people.join(" & ");

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-10 pt-8">
			<header className="mb-2 text-center">
				<p className="text-sm font-extrabold uppercase tracking-[0.22em] text-mute">
					Daily calls
				</p>
				<h1 className="mt-2 text-4xl font-black tracking-tight">{names}</h1>
				<p className="mt-2 text-mute">
					Once a day. Five days a week. Two grace days.
				</p>
			</header>

			<TrackerTabs active={tab} onChange={setTab} />

			{tab === "calls" ? <CallsPanel snapshot={snapshot} /> : null}
			{tab === "us" ? (
				<UsPanel
					snapshot={snapshot}
					checkIns={checkIns}
					statuses={statuses}
					thinkingStats={thinkingStats}
				/>
			) : null}
			{tab === "play" ? (
				<PlayPanel
					todayQuestion={todayQuestion}
					questionBankCount={questionBankCount}
					bucket={bucket}
				/>
			) : null}

			<p className="mt-auto pt-8 text-center text-xs font-bold text-line">
				Weeks start Monday in {snapshot.timezone.replace("_", " ")}. Need 5 days.
				Two grace misses.
			</p>
		</main>
	);
}
