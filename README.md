# Zane & Ruby Call Streak

A dark, Duolingo-style habit tracker for **Zane** and **Ruby**. The goal is simple: call each other at least **5 times a week** and see how long the streak lasts.

No login. No codes. Open the site, tap **We called** when you hang up.

## How it works

- One shared log. Each tap is one call between you.
- A week runs Monday–Sunday in `America/Los_Angeles`.
- Hit 5 calls in a week and that week counts.
- Miss a full week and the streak resets.
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
