import { buildSnapshot } from "@/lib/streak";
import { buildThinkingStats } from "@/lib/thinking";
import { sortBucketItems } from "@/lib/bucket";
import { PEOPLE } from "@/lib/config";
import {
	getStorageKind,
	getTodayQuestion,
	listBucket,
	listCheckIns,
	listCalls,
	listQuestionBank,
	listStatuses,
	listThinking,
} from "@/lib/storage";
import { Tracker } from "@/components/tracker";

export const dynamic = "force-dynamic";

/**
 * Loads every shared board and renders the tracker.
 */
export default async function Home() {
	const now = new Date();
	const storage = getStorageKind();
	const [calls, checkIns, statuses, thinking, bucket, questionBank, todayQuestion] =
		await Promise.all([
			listCalls(),
			listCheckIns(),
			listStatuses(),
			listThinking(),
			listBucket(),
			listQuestionBank(),
			storage === "missing" ? Promise.resolve(null) : getTodayQuestion(now),
		]);

	const snapshot = buildSnapshot(calls, now, storage);
	const thinkingStats = buildThinkingStats(thinking, PEOPLE);

	return (
		<Tracker
			snapshot={snapshot}
			checkIns={checkIns}
			statuses={statuses}
			thinkingStats={thinkingStats}
			todayQuestion={todayQuestion}
			questionBankCount={questionBank.length}
			bucket={sortBucketItems(bucket)}
		/>
	);
}
