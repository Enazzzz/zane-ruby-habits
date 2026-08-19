# Implementation notes for the shared call tracker

## Files

- `src/lib/dates.ts` — timezone civil dates and Monday-week helpers
- `src/lib/duration.ts` — call-length parsing and formatting
- `src/lib/streak.ts` — daily goal, grace days, day streak, homepage snapshot
- `src/lib/checkins.ts` — sanitize names/notes and keep the newest visit per person
- `src/lib/status.ts` — three-field status sanitizing
- `src/lib/thinking.ts` — thinking-of-you stats
- `src/lib/questions.ts` — bank draw and daily answers
- `src/lib/bucket.ts` — bucket-list sanitizing and sorting
- `src/lib/storage.ts` — Upstash Redis + local `data/calls.json`
- `src/app/actions.ts` — server actions for every mutation
- `src/components/tracker.tsx` — tab shell
- `src/components/calls-panel.tsx` — streak + call duration
- `src/components/us-panel.tsx` — status, thinking, check-ins
- `src/components/play-panel.tsx` — question bank + bucket list

## Persistence

Prefer Redis keys documented in `README.md`. Local JSON is only for `next dev`.

## Daily question flow

1. On page load, look for a daily question with today's civil date.
2. If missing, draw one random item from the bank and persist it.
3. Answers are stored on that daily record; bank suggestions never become today instantly.
