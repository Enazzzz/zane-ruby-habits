/**
 * Shared product constants for the Zane & Ruby call tracker.
 */
export const PEOPLE = ["Zane", "Ruby"] as const;

/** Weekly call target the pair is committing to. */
export const WEEKLY_GOAL = 5;

/**
 * Calendar timezone for week boundaries.
 * Weeks run Monday 00:00 through Sunday 23:59:59 in this zone.
 */
export const TRACKER_TIMEZONE = "America/Los_Angeles";

/** Redis list key for the shared call log. */
export const REDIS_CALLS_KEY = "zane-ruby:calls";

/** Soft cap so accidental hammering cannot flood the log. */
export const MAX_CALLS_PER_DAY = 12;
