import { buildSnapshot } from "@/lib/streak";
import { getStorageKind, listCalls } from "@/lib/storage";
import { Tracker } from "@/components/tracker";

export const dynamic = "force-dynamic";

/**
 * Loads the shared call log and renders the tracker.
 */
export default async function Home() {
	const calls = await listCalls();
	const snapshot = buildSnapshot(calls, new Date(), getStorageKind());

	return <Tracker snapshot={snapshot} />;
}
