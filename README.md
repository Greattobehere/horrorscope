# HorrorScope

Horror-comedy horoscopes personalized to your birth date — fictional
entertainment only. Live at [horrorscope.art](https://horrorscope.art).

Two characters, twin witches: **Sonia** (good, warm) delivers the Bright
Side reading and welcome emails; **Moira** (evil, witchy) delivers the
Horror Mirror reading and the "Change Your Fate" rewrite.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values you have — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works with
zero configuration — no env vars are required for local dev. Without
`ANTHROPIC_API_KEY` it falls back to 720 pre-written static readings;
without Stripe configured, the Veil Season Pass button shows "Coming
Soon" instead of a broken link.

## Environment variables

See `.env.example` for the full annotated list, including the Stripe
dashboard walkthrough for the Veil Season Pass. Summary:

| Variable | Required | What breaks without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Falls back to static pre-written readings instead of live AI generation |
| `RESEND_API_KEY` | No | Welcome/unlock emails are logged to console instead of sent |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `http://localhost:3000`; set to your real domain in production |
| `PASS_SECRET` | For the pass | Needed before any Veil Season Pass tokens can be signed/verified |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | For the pass | Pass purchase webhook won't work |
| `NEXT_PUBLIC_PAYMENT_LINK` | For the pass | The purchase button shows "Coming Soon" until this is a real Stripe Payment Link |

No database is used — the pass system is stateless (HMAC-signed tokens,
see `lib/pass.ts`), and there's no lead/subscriber storage beyond sending
the welcome email.

## Deploy

Connected to Vercel via GitHub — pushes to `main` deploy to production,
other branches get preview deployments. Add the environment variables
above in Vercel → Project Settings → Environment Variables, matching
whichever ones you have configured.

## Marketing / growth

See the separate `horrorscope-growth` repo (sibling directory) for
video scripts, voice generation tooling, the creator outreach list, and
the Halloween 2026 growth plan.
