# Zane & Ruby Call Streak Tracker

Shared, no-login board for Zane and Ruby.

Live site: https://zane-ruby-habits.vercel.app

## Product

- **Calls:** once-a-day logging, day streak, weekly grace, optional call duration.
- **Us:** three-field status, thinking-of-you pings, last-here notes.
- **Play:** question-of-the-day bank plus shared bucket list.
- One public page with Calls / Us / Play tabs.
- No accounts, PINs, or invite codes.

## Architecture

- Next.js App Router on Vercel.
- Server Actions mutate Redis lists or local JSON.
- Marketplace `KV_REST_API_*` and official `UPSTASH_REDIS_REST_*` env vars both work.
- Local fallback: `data/calls.json`.

## Non-goals

- Auth, notifications, or per-person competitive scoring.
- True websocket realtime. Updates appear after actions refresh the page.
