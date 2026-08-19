import { buildSnapshot } from "@/lib/streak";
import { getStorageKind, listCalls, listCheckIns } from "@/lib/storage";
import { Tracker } from "@/components/tracker";

export const dynamic = "force-dynamic";

/**
 * Loads the shared call log and check-ins, then renders the tracker.
 */
export default async function Home() {
	const [calls, checkIns] = await Promise.all([listCalls(), listCheckIns()]);
	const snapshot = buildSnapshot(calls, new Date(), getStorageKind());

	return <Tracker snapshot={snapshot} checkIns={checkIns} />;
}
