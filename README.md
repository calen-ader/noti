# Noti

A shared studio for song sheets: a vocal coach marks who sings each line, a guitar teacher adds
chords, and students open one always-current link per project. No student accounts.

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

- `src/studio/app.js` the whole studio as one plain module (ported from the v7 prototype), drawn into
  the page by `src/studio/Studio.tsx`; `studio.css` its look; `store.ts` loading and saving
- `src/app/` pages: sign-in (`/`), studio (`/estudio`), the student link (`/m/<token>`), the link to
  join a project as an editor (`/unirse/<token>`), and `/demo` (example songs kept in the browser)
- `supabase/migrations/0002_studio.sql` projects, songs, members and profiles, with versioned saves;
  `0001` holds the first version's tables, no longer used by the app
- `src/lib/logo/noti-hero.js` the animated wordmark (from the logo motion work, kept as one file)
- `src/lib/sheet/` the first version's sheet model and its tests
