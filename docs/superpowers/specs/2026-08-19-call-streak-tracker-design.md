# Zane & Ruby Call Streak Tracker

Shared, no-login habit tracker for Zane and Ruby. Goal: call each other at least 5 times every week and keep a consecutive-week streak.

## Product

- One public page. No accounts, PINs, or invite codes.
- One shared log: each tap is one call between them.
- Weekly goal is 5 calls (Monday–Sunday in `America/Los_Angeles`).
- Streak counts consecutive weeks that hit the goal. The current week can extend the streak as soon as it hits 5; a miss only breaks the streak after that week ends.
- Accidental taps can be undone (removes the most recent call).
- Dark Duolingo-style UI, mobile-first.

## Architecture

- Next.js App Router on Vercel.
- Server Actions mutate the log; the home page reads it.
- Durable store: Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
- Local fallback: `data/calls.json` for development.

## Non-goals

- Individual per-person scores, auth, notifications, or social features.
