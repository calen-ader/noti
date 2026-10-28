# Noti

Live song sheets for a vocal coach and an instrument teacher, shared with their students
through one always-current link per show or per song.

- **Euge (voice):** who sings which line or word, overlapping parts, notes, pen and audio.
- **Guille (instruments):** typed chord charts drawn as bar grids.
- **Students:** open a show link or a song link and see their parts. No accounts.

Live: https://noti-rho.vercel.app (deploys from `main`)

Scope and decisions: https://claude.ai/artifact/DGEpCZAtwySJtHRgmL7mDk

## Run

```
cp .env.example .env.local   # fill in the Supabase URL and anon key
npm install
npm run dev
npm test
```

The database schema is in `supabase/migrations/`. Apply it with the Supabase SQL editor or
`supabase db push`. In Supabase Auth → URL Configuration, set the Site URL to the deployed
address and allow `<address>/auth/callback` as a redirect, or sign-in links land on localhost.
On Vercel, add both env vars as Config (not Secret): `NEXT_PUBLIC_` values ship to the browser.

## Layout

- `src/lib/sheet/` sheet model, paste clean-up, and re-anchoring of assignments when lyrics change
- `src/lib/logo/noti-hero.js` the animated wordmark (from the logo motion work, kept as one file)
- `src/app/` pages: teacher sign-in hero, studio (`/estudio`), student links (`/m/<token>` show,
  `/c/<token>` song), local demo (`/demo`)
