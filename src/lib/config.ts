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

/** Redis JSON blob for latest status per person. */
export const REDIS_STATUS_KEY = "zane-ruby:status";

/** Redis list key for thinking-of-you pings. */
export const REDIS_THINKING_KEY = "zane-ruby:thinking";

/** Redis list key for the question bank. */
export const REDIS_QUESTION_BANK_KEY = "zane-ruby:question-bank";

/** Redis list key for past daily questions. */
export const REDIS_DAILY_QUESTIONS_KEY = "zane-ruby:daily-questions";

/** Redis list key for the shared bucket list. */
export const REDIS_BUCKET_KEY = "zane-ruby:bucket";

/** Cap stored check-ins so the log cannot grow forever. */
export const MAX_CHECKINS = 80;

/** Cap thinking pings kept in storage. */
export const MAX_THINKING = 200;

/** Cap bucket-list items. */
export const MAX_BUCKET_ITEMS = 100;

/** Cap questions waiting in the bank. */
export const MAX_QUESTION_BANK = 120;

/** One logged call per civil day. */
export const MAX_CALLS_PER_DAY = 1;

/** Longest call duration the UI accepts, in minutes. */
export const MAX_CALL_DURATION_MINUTES = 24 * 60;
