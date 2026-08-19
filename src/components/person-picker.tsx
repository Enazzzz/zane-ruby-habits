"use client";

import { useSyncExternalStore } from "react";
import { PEOPLE } from "@/lib/config";
import { canonicalPerson } from "@/lib/person";

const SAVED_NAME_KEY = "zane-ruby:person-name";

type PersonPickerProps = {
	value: string;
	onChange: (name: string) => void;
	disabled?: boolean;
};

/**
 * Quick Zane/Ruby chips plus a free-text name fallback.
 */
export function PersonPicker({ value, onChange, disabled = false }: PersonPickerProps) {
	return (
		<div className="flex gap-2">
			{PEOPLE.map((person) => {
				const selected = value.trim().toLowerCase() === person.toLowerCase();
				return (
					<button
						key={person}
						type="button"
						disabled={disabled}
						onClick={() => onChange(person)}
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
	);
}

/**
 * Reads the last name this browser used on shared actions.
 */
export function useSavedName(): [string, (name: string) => void] {
	const stored = useSyncExternalStore(subscribeSavedName, readSavedName, () => "");
	return [stored, rememberSavedName];
}

/**
 * Persists a chosen name in localStorage when possible.
 */
export function rememberSavedName(name: string): void {
	try {
		window.localStorage.setItem(SAVED_NAME_KEY, name.trim());
	} catch {
		// Private mode can block localStorage; the typed name still works.
	}
}

/**
 * Returns the typed or saved name, preferring an in-progress edit.
 */
export function resolveName(edited: string | null, stored: string): string {
	return edited ?? stored;
}

/**
 * Saves the canonical Zane/Ruby label when the typed name matches.
 */
export function finalizeName(name: string): string {
	return canonicalPerson(name) ?? name.trim();
}

/**
 * Reads the last saved person name from localStorage.
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
