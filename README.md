# Zane & Ruby Call Streak

A dark, Duolingo-style shared board for **Zane Davis** and **Ruby**. Call **once a day**, hit **5 days a week** (two grace misses), and keep a day streak alive. The page also tracks status, thinking-of-you pings, daily questions, and a bucket list.

Live site: **https://zane-ruby-habits.vercel.app**

No login. No codes. Open the page, pick your name, and tap what you need.

## Tabs

### Calls

- One shared log. **One call per calendar day.**
- Streaks are counted in **days**. Each Monday–Sunday week you get **two grace days**.
- You need **5 call-days** in a finished week. Extra days are fine. Fewer than 5 **breaks the streak**.
- Optional **call length in minutes** when you log a call or after the fact.
- **Undo last call** if someone taps by accident.

### Us

- **Right now:** listening to, location, and what you are doing.
- **Thinking of you:** one-tap ping with last time and total count.
- **Last here:** name + tiny note + automatic timestamp.

### Play

- **Question of the day:** suggest questions into a bank; one random question is picked each day and removed from the bank. Both people can answer.
- **Bucket list:** shared open/done items you can add, check off, or delete.

## Local development

```bash
npm install
npm run dev
```

Without Redis, everything is saved to `data/calls.json`.

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

The app also accepts the official Upstash names (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Until a store is connected and the app is redeployed, nothing will persist.

## Storage

| What | Redis key | Local file field |
| --- | --- | --- |
| Call log | `zane-ruby:calls` | `calls` |
| Check-in notes | `zane-ruby:checkins` | `checkIns` |
| Status | `zane-ruby:status` | `statuses` |
| Thinking pings | `zane-ruby:thinking` | `thinking` |
| Question bank | `zane-ruby:question-bank` | `questionBank` |
| Daily questions | `zane-ruby:daily-questions` | `dailyQuestions` |
| Bucket list | `zane-ruby:bucket` | `bucket` |

All of the above live in `data/calls.json` during local development.
