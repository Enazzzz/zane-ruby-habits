# Zane & Ruby Call Streak

A dark, Duolingo-style habit tracker for **Zane** and **Ruby**. Call **once a day**, hit **5 days a week** (two grace misses), and see how long the day streak lasts.

No login. No codes. Open the site, tap **We called** when you hang up.

## How it works

- One shared log. One call per calendar day.
- Streaks are counted in **days**. Each week you get **two grace days**.
- You can call more than 5 days. A finished week with fewer than 5 days **breaks the streak**.
- The board shows all-time calls and your best day streak.
- A week runs Monday–Sunday in `America/Los_Angeles`.
- **Undo last call** if someone taps by accident.

## Local development

```bash
npm install
npm run dev
```

Calls are saved to `data/calls.json` when Redis is not configured.

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

Until the store is connected and the app is redeployed, logged calls will not persist.

Then send Ruby the production URL. That is the whole product.
