# Implementation notes for the shared call tracker

## Files

- `src/lib/dates.ts` — timezone civil dates and Monday-week helpers
- `src/lib/streak.ts` — daily goal, grace days, day streak, and homepage snapshot
- `src/lib/checkins.ts` — sanitize names/notes and keep the newest visit per person
- `src/lib/storage.ts` — Upstash Redis lists, or local `data/calls.json`
- `src/app/actions.ts` — `logCall` / `undoCall` / `leaveCheckIn`
- `src/components/tracker.tsx` — dark Duolingo-style board plus **Last here**
- `src/lib/streak.test.ts` — streak and grouping tests
- `src/lib/checkins.test.ts` — name/note sanitizing and latest-by-name
- `src/lib/storage.test.ts` — local JSON call log and check-in coexistence

## Persistence

Prefer Redis lists `zane-ruby:calls` and `zane-ruby:checkins`. Marketplace KV stores inject `KV_REST_API_URL` / `KV_REST_API_TOKEN`; official Upstash names also work. Local JSON is only for `next dev`.
