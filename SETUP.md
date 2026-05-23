# devancarlson.com — setup

Personal site + side-projects (currently: **Gigg**, a song-writing app for musicians).
Vite + React + Tailwind on the frontend, Netlify Functions + Supabase on the backend.

## Project layout

```
src/
  components/           shared UI (Layout, LoginButton, ProtectedRoute)
  lib/
    supabase.ts         Supabase client
    auth.tsx            shared Google-OAuth context (reusable for future side-projects)
    database.types.ts   hand-written DB types
  routes/
    home/Home.tsx       personal site (bio, YouTube, side-projects list)
    gigg/               Gigg app (songs, sections, chords, setlists, tags)
netlify/functions/
  lyrics.ts             Genius proxy + lyrics page extractor
supabase/
  schema.sql            DB schema + RLS policies
```

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com, create a new project.
2. In **Authentication → Providers**, enable **Google**. You'll need to create OAuth credentials at https://console.cloud.google.com/apis/credentials:
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - Add the client ID and secret into the Supabase Google provider panel.
3. In **Authentication → URL Configuration**, add your site URLs (`http://localhost:8888` for local dev, plus your Netlify URL).
4. Open the **SQL editor** and run `supabase/schema.sql`.

### 3. Get a Genius API token

Sign up at https://genius.com/api-clients, create a client, copy the **Client Access Token**.

### 4. Configure env vars

Copy and fill in:

```bash
cp .env.example .env
```

For the Netlify deploy, add the same variables under **Site settings → Environment variables**. `VITE_*` vars need to be present at build time; `GENIUS_ACCESS_TOKEN` is read at function runtime.

## Local development

```bash
npm run dev
```

This runs `netlify dev`, which serves Vite on the inside and the Functions on the outside at http://localhost:8888. The `/api/lyrics` route is wired through Netlify.

To run Vite alone (no functions):

```bash
npm run dev:vite
```

## Deploy

Push to GitHub, connect the repo on Netlify. Build settings come from `netlify.toml`:

- Build: `npm run build`
- Publish: `dist`
- Functions: `netlify/functions`

## Adding a future side-project

The auth context (`src/lib/auth.tsx`) and Supabase client are app-wide, so any new
route automatically gets Google login. To add a new project:

1. Add a folder under `src/routes/<project>/`.
2. Add the routes in `src/App.tsx`, wrapped in `<ProtectedRoute>` if it needs login.
3. Add a card to the `SIDE_PROJECTS` array in `src/routes/home/Home.tsx`.
4. If it needs its own tables, add them to `supabase/schema.sql` (and enable RLS!).

## Gigg song-entry format

In the song editor, the chords textarea is parsed as:

```
[Verse 1]
C G Am F
C G F

[Chorus]
Am F C G
```

- Lines wrapped in `[brackets]` start a new section.
- Chord lines are split on whitespace and `|`, so `| C | G | Am | F |` works too.
- Live preview chips appear below the textarea as you type.
