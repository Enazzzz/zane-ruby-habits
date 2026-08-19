"use client";

type TrackerTabsProps = {
	active: TrackerTab;
	onChange: (tab: TrackerTab) => void;
};

/** Main homepage sections. */
export type TrackerTab = "calls" | "us" | "play";

const TABS: { id: TrackerTab; label: string }[] = [
	{ id: "calls", label: "Calls" },
	{ id: "us", label: "Us" },
	{ id: "play", label: "Play" },
];

/**
 * Switches between the Calls, Us, and Play sections.
 */
export function TrackerTabs({ active, onChange }: TrackerTabsProps) {
	return (
		<nav className="mb-6 grid grid-cols-3 gap-2 rounded-[20px] bg-panel p-1 shadow-[0_6px_0_#152226]">
			{TABS.map((tab) => {
				const selected = tab.id === active;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => onChange(tab.id)}
						className={`h-11 rounded-2xl text-sm font-black ${
							selected ? "bg-duo text-ink" : "text-mute"
						}`}
					>
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
}
