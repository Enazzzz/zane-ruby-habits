/**
 * Shared product constants for the Zane & Ruby call tracker.
 */
export const PEOPLE = ["Zane", "Ruby"] as const;

/** Call-days needed in a Monday–Sunday week to keep the streak. */
export const WEEKLY_GOAL = 5;

/** Missed days allowed each week without breaking the day streak. */
export const GRACE_DAYS_PER_WEEK = 2;

/**
 * Calendar timezone for week boundaries.
 * Weeks run Monday 00:00 through Sunday 23:59:59 in this zone.
 */
export const TRACKER_TIMEZONE = "America/Los_Angeles";

/** Redis list key for the shared call log. */
export const REDIS_CALLS_KEY = "zane-ruby:calls";

/** Redis list key for "I'm here" check-in notes. */
export const REDIS_CHECKINS_KEY = "zane-ruby:checkins";

/** Cap stored check-ins so the log cannot grow forever. */
export const MAX_CHECKINS = 80;

/** One logged call per civil day. */
export const MAX_CALLS_PER_DAY = 1;
