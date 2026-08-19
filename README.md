# Zane & Ruby Call Streak

A dark, Duolingo-style habit tracker for **Zane Davis** and **Ruby**. Call **once a day**, hit **5 days a week** (two grace misses), and see how long the day streak lasts. At the bottom, leave a name and a tiny note so the other person knows when you last opened the site.

Live site: **https://zane-ruby-habits.vercel.app**

No login. No codes. Open the page, tap **We called** when you hang up, or **I'm here** when you stop by.

## How it works

### Daily calls

- One shared log. **One call per calendar day.**
- Streaks are counted in **days**, not weeks. Each Monday–Sunday week you get **two grace days**.
- You need **5 call-days** in a finished week. Extra days are fine. Fewer than 5 **breaks the streak**.
- The board shows all-time unique call days and your best day streak.
- A week runs Monday–Sunday in `America/Los_Angeles`.
- **Undo last call** if someone taps by accident.

### Last here

- At the bottom, pick **Zane** or **Ruby** (or type a name), add a small message, and tap **I'm here**.
- The timestamp is saved automatically. The board shows each person's **newest** visit.
- Check-ins are a visit log. They do **not** count toward the call streak.
- Anyone with the URL can leave a note. There is no login.

## Local development

```bash
npm install
npm run dev
```

Without Redis, calls and check-ins are saved to `data/calls.json`.

```bash
npm test
npm run lint
npm run build
```

## Deploy on Vercel

1. Import this GitHub repo into [Vercel](https://vercel.com/new).
2. Add **Upstash Redis** from the Vercel Marketplace. Stores named `upstash-kv-*` inject `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. On the store page, **Connect Project** to this app for Production, Preview, and Development.
4. Redeploy so the new env vars are actually in the running site.

The app also accepts the official Upstash names (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Until a store is connected and the app is redeployed, logged calls and check-ins will not persist.

Then send Ruby the production URL. That is the whole product.

## Storage

| What | Redis key | Local file |
| --- | --- | --- |
| Call log | `zane-ruby:calls` | `data/calls.json` (`calls`) |
| Check-in notes | `zane-ruby:checkins` | `data/calls.json` (`checkIns`) |

Check-ins are capped at 80 so the log cannot grow forever.
