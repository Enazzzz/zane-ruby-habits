# Implementation notes for the shared call tracker

## Files

- `src/lib/dates.ts` — timezone civil dates and Monday-week helpers
- `src/lib/streak.ts` — goal, streak, and homepage snapshot
- `src/lib/storage.ts` — Upstash Redis list, or local `data/calls.json`
- `src/app/actions.ts` — `logCall` / `undoCall`
- `src/components/tracker.tsx` — dark Duolingo-style board
- `src/lib/streak.test.ts` — streak and grouping tests

## Persistence

Prefer Redis list `zane-ruby:calls`. Local JSON is only for `next dev`.
