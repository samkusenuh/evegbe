# Eʋegbe — Community Learning Platform

A community-built platform for learning the **Ewe language** (Eʋegbe), spoken in Ghana, Togo, and Benin.

Members can:
- **Submit** words and short phrases (with full Ewe orthography — ɖ ɛ ƒ ɣ ŋ ɔ ʋ and tone marks)
- **Record** their own pronunciations straight from the browser
- **Validate** other members' submissions and recordings
- **Earn reputation** for contributions. **Native speakers' votes carry 3× weight**, so the trusted dictionary emerges from real community consensus.

Seed vocabulary (~180 words/phrases across 13 thematic groups) was extracted from the open textbook [*Basic Ewe for Foreign Students*](https://philtypo3.uni-koeln.de/sites/inst_afrika/pdf/BASIC_EWE_2nd_ed.pdf) (Dzablu-Kumah, Claudi & Ossey, University of Cologne, 2015).

---

## Tech stack

| Layer      | Choice                          | Why                                                   |
| ---------- | ------------------------------- | ----------------------------------------------------- |
| Framework  | Next.js 15 (App Router) + React 19 | SSR, API routes, deploys to Vercel in one click      |
| Language   | TypeScript                      | Catches bugs early, better DX                         |
| Styling    | Tailwind CSS                    | Fast, no runtime overhead                             |
| Database   | Supabase (Postgres)             | Hosted Postgres + Row Level Security                  |
| Auth       | Supabase Auth (email + password) | Battle-tested, free tier generous                    |
| Storage    | Supabase Storage                | For audio recordings (`.webm` / `.m4a`)               |
| Hosting    | Vercel                          | Git-based auto-deploys, generous free tier            |

**Estimated monthly cost** for the first few hundred active users: **€0** (fits comfortably in Supabase + Vercel free tiers).

---

## Quick start

### 1. Set up Supabase (one-time, ~5 minutes)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. Click **New project**:
   - Name: `evegbe` (or whatever)
   - Database password: generate a strong one and save it
   - Region: pick one near you (Frankfurt `eu-central-1` for NL)
   - Plan: **Free**
3. Wait ~2 minutes while the project provisions.
4. In the sidebar, open **SQL Editor** → **New query**:
   - Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) → **Run** ✅
   - New query again, paste [`supabase/seed.sql`](./supabase/seed.sql) → **Run** ✅
5. Open **Project Settings → API**. Copy:
   - **Project URL** → will become `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → will become `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **About audio storage:** The `recordings` bucket is created automatically by the schema and set to public (anyone with the URL can play back). If you want recordings to be private, change `public` to `false` in the schema's `insert into storage.buckets` line and use signed URLs in `components/RecordingList.tsx`.

### 2. Run locally

```bash
# Clone or unzip this project, then:
cd ewe-platform
npm install
cp .env.local.example .env.local
# Paste your Supabase URL + anon key into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, add a word, record a pronunciation, ship it.

### 3. Deploy to Vercel

The easiest path — git-based, auto-deploys on every push:

1. Create a new GitHub repo and push this code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create evegbe --public --source=. --push
   # (or push manually to a repo you created in the GitHub UI)
   ```
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.
3. In the deploy configuration, add the two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** — Vercel will build and host it at `evegbe.vercel.app` (or whatever name you choose).
5. From here, **every `git push` auto-deploys** a new version. Preview deployments for branches work out of the box.

Optional: add a custom domain in Vercel → Project → Settings → Domains.

### 4. Email confirmation (recommended before launch)

By default, Supabase requires email confirmation for new signups. For development you can turn this off:
- Supabase → **Authentication → Providers → Email** → disable "Confirm email"

For production, **leave it on**. For custom branded emails, Supabase → Authentication → Email Templates.

---

## Project structure

```
ewe-platform/
├── app/
│   ├── (auth)/              Sign in / sign up pages
│   ├── entries/             Browse, add, view word details
│   ├── profile/             User profile & reputation events
│   ├── layout.tsx           Global header + nav
│   ├── page.tsx             Landing page
│   └── globals.css
├── components/
│   ├── CharBar.tsx          Ewe special-character keyboard
│   ├── AudioRecorder.tsx    Browser-based audio recording (MediaRecorder)
│   ├── RecordingList.tsx    Playback + voting per recording
│   ├── ValidationButtons.tsx Correct / Incorrect voting
│   └── SignOutButton.tsx
├── lib/
│   ├── supabase-client.ts   Browser Supabase client
│   ├── supabase-server.ts   Server components Supabase client
│   └── types.ts             Shared TypeScript types
├── supabase/
│   ├── schema.sql           Full database schema + triggers + RLS
│   └── seed.sql             ~180 initial entries + 13 groups
├── middleware.ts            Session refresh middleware
└── README.md                You are here
```

---

## How the reputation / credit system works

Every action is logged in `reputation_events` and reflected in `profiles.reputation`:

| Action                     | Points  |
| -------------------------- | ------- |
| Submit a new entry         | +2      |
| Your entry gets approved¹  | +10     |
| Upload a recording         | +3      |
| Vote on anything           | +1      |
| **Native speaker's vote**  | counts 3× toward approval score |

¹ An entry is auto-promoted to `approved` once its approval score reaches **5** (e.g., 2 native-speaker votes = 6 → approved, or 5 regular votes). It becomes `disputed` if rejection outweighs approval by 3+.

All of this is driven by **Postgres triggers** in `schema.sql` — no cron jobs, no API worker, no race conditions. The database is the source of truth.

---

## Database schema at a glance

- **`profiles`** — one per registered user; stores reputation, native-speaker flag
- **`groups`** — thematic categories (Greetings, Verbs, Food, …)
- **`entries`** — words and short phrases with `status` (`pending`/`approved`/`disputed`)
- **`recordings`** — audio uploads tied to entries, with their own approval score
- **`validations`** — one vote per user per target (entry or recording), unique-constrained
- **`reputation_events`** — audit log of every point award

All tables use **Row Level Security**:
- Everything is **readable by everyone** (so unauthenticated visitors can browse)
- Only **authenticated users** can insert
- Users can only edit **their own** content, and only while still pending
- Native-speaker status is **self-attested** on signup (easy to swap for admin approval later — see "Future work")

---

## Audio recording details

- Uses the browser's **`MediaRecorder` API** (works on Chrome, Firefox, Safari 14.1+, mobile browsers)
- Prefers `audio/webm;codecs=opus` (small, high quality), falls back to `audio/mp4` on Safari
- **Hard 10-second cap** per clip — keeps storage lean, encourages focused pronunciations
- Files land in Supabase Storage at `recordings/<user_id>/<entry_id>-<timestamp>.<ext>`
- At typical bitrate, each recording is **~20–50 KB** → 1 GB storage = ~20,000+ recordings

---

## Future work (not blocking launch)

Easy wins once the platform has some use:

- **Mobile apps** — wrap the existing site with Capacitor or Expo; most of the UI already works great on mobile.
- **Study mode** — bring back the flashcard flow from the original artifact prototype.
- **Native-speaker verification** — admin-approved badge rather than self-attested (admin dashboard in `/admin` using Supabase service role).
- **Audio waveform preview** — WaveSurfer.js on the recording cards.
- **Full-text search ranking** — swap the current `ilike` for `tsvector` + `websearch_to_tsquery` (schema already has the GIN index).
- **Realtime updates** — Supabase Realtime channels on the entries page so new submissions appear live.
- **i18n UI** — translate the interface itself into Ewe and French.
- **Dark mode** — color tokens are already set up; one Tailwind variant plus a theme toggle.
- **Email digests** — weekly summary of entries you've validated or that were approved.

---

## Licenses

- Code: MIT (do what you like)
- Seed vocabulary: adapted from *Basic Ewe for Foreign Students*; attribution preserved in the footer.

Have fun. Nyó! 🌿
