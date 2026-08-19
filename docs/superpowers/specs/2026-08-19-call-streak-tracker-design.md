# Zane & Ruby Call Streak Tracker

Shared, no-login habit tracker for Zane and Ruby. Goal: call each other **once a day**, hit **5 days** every Monday–Sunday week (two grace misses), and keep a consecutive **day** streak. A separate **Last here** note lets each person timestamp when they last opened the site.

Live site: https://zane-ruby-habits.vercel.app

## Product

- One public page. No accounts, PINs, or invite codes.
- One shared call log: each tap is one call between them. **One call per calendar day.**
- Streaks are counted in **days**. Each week allows **two grace misses**. A finished week with fewer than 5 call-days **breaks the streak**. Extra days are fine.
- A week runs Monday–Sunday in `America/Los_Angeles`.
- Accidental taps can be undone (removes the most recent call).
- **Last here:** name + optional short message + automatic timestamp. Newest note per name is shown. This is a visit log, not part of the streak.
- Dark Duolingo-style UI, mobile-first.

## Architecture

- Next.js App Router on Vercel.
- Server Actions mutate the logs; the home page reads them.
- Durable store: Upstash Redis when Marketplace `KV_REST_API_*` or official `UPSTASH_REDIS_REST_*` vars are set.
- Redis lists: `zane-ruby:calls` and `zane-ruby:checkins` (capped at 80 notes).
- Local fallback: `data/calls.json` (`calls` + `checkIns`) for development.

## Non-goals

- Individual per-person scores, auth, notifications, or social features.
- Treating a website visit as a logged call.
