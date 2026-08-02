# Stracker — Nifty 50 Sentiment Dashboard

A read-only dashboard over the `articles` / `stocks` tables you've already
built with the Gemini + Supabase ingestion pipeline. Built with Next.js 14
(App Router), TypeScript, Tailwind, and Recharts.

This is set up as a **portfolio piece**, not a production trading tool:
no live data ingestion is wired into the frontend (that stays a manual
`npm run process-news` step in the pipeline repo), and there's no cost
risk from the dashboard itself — it only reads what's already in Supabase.

## What's in it

- **Home** — a scrolling ticker tape of recent headlines, sentiment
  totals (Bullish / Bearish / Neutral), a sentiment-by-sector bar chart,
  and a feed of "high-impact" news (`is_systemic = true`, i.e. macro/
  policy stories that move the whole market rather than one stock).
- **Watchlist** — toggle between two mutually exclusive filters:
  - **By stocks**: a searchable multi-select checklist (search by
    ticker or company name), showing news for every selected stock.
  - **By sector**: a single dropdown, showing news across every stock
    in that sector.
  Your last selection is remembered across reloads (`localStorage`).
- Two small internal API routes (`/api/stocks`, `/api/news/home`,
  `/api/news/watchlist`) that the Watchlist page calls client-side; the
  Home page fetches directly from Supabase in a Server Component for
  speed (no extra network hop).

## Design notes

The visual language leans into a trading-terminal aesthetic rather than
a generic SaaS dashboard: near-black background, hairline borders, no
heavy shadows or big border-radius, tabular monospace numerals for data,
and a saffron accent (a deliberate, understated nod to the NSE/India
subject matter, not a generic brand color). Sentiment gets a consistent
semantic mapping throughout — green ▲ / red ▼ / grey ▬ — echoing a
price-ticker convention rather than arbitrary badge colors. The
scrolling ticker tape on the home page is the one signature flourish;
everything else stays quiet and functional. It's `prefers-reduced-motion`
aware and pauses on hover.

## Architecture / security note

Both the API routes and the Home page's Server Component use the
Supabase **service role** key, kept server-side only via `lib/supabaseAdmin.ts`
(guarded by the `server-only` package so it can't accidentally be
imported into a Client Component). The browser never sees this key —
it only ever talks to your own `/api/*` routes.

This is a deliberate simplification for a read-only portfolio project.
If you wanted to expose Supabase directly to the browser instead (e.g.
to drop the API routes entirely), you'd switch to the anon key and add
read-only RLS policies:

```sql
alter table public.articles enable row level security;
alter table public.stocks enable row level security;

create policy "Public read access" on public.articles for select using (true);
create policy "Public read access" on public.stocks for select using (true);
```

Not required for this setup — just noted in case you evolve the project.

## Project layout

```
stracker-web/
├── app/
│   ├── layout.tsx              # fonts + navbar + shell
│   ├── page.tsx                 # Home (Server Component)
│   ├── watchlist/page.tsx       # Watchlist (Client Component)
│   └── api/
│       ├── stocks/route.ts
│       └── news/
│           ├── home/route.ts
│           └── watchlist/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── TickerTape.tsx
│   ├── SentimentStats.tsx
│   ├── SentimentChart.tsx
│   ├── SentimentBadge.tsx
│   ├── NewsCard.tsx
│   ├── StockMultiSelect.tsx
│   └── SectorSelect.tsx
├── lib/
│   ├── data.ts                  # all Supabase queries live here
│   ├── supabaseAdmin.ts         # server-only client
│   └── types.ts
└── .env.local.example
```

## 1. Install dependencies

```bash
cd stracker-web
npm install
```

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Same project you've been using for the ingestion pipeline — this app
just reads from it.

## 3. Run it

```bash
npm run dev
```

Open **http://localhost:3000**. The Home page should show your macro
news and sentiment chart; Watchlist should let you search stocks (try
`TCS`, `RELIANCE`, `HDFCBANK`) or pick a sector (try `Banking` or
`Technology`).

If a page looks empty, it means that category has no data yet in
Supabase for the current dataset — not a bug. Check with:

```sql
select category, is_systemic, count(*) from public.articles group by 1, 2;
```

## 4. Build for production / deploy

```bash
npm run build
npm run start
```

For a resume-friendly public deploy, **Vercel** is the path of least
resistance (it's made by the Next.js team, free tier is generous, and
zero-config for this project structure):

1. Push this folder to a GitHub repo.
2. Import it in Vercel.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as environment
   variables in the Vercel project settings.
4. Deploy.

## Suggested next improvements

Kept out of this pass to stay in scope, roughly in order of effort/impact:

- **Loading skeletons** instead of plain "Loading…" text — quick visual
  polish win.
- **Sentiment trend over time** (a line chart of daily bullish/bearish
  counts) — needs a `published_at`-bucketed query, straightforward to add.
- **Pagination or infinite scroll** on the news feeds once the dataset
  grows past a page or two.
- **Real embeddings + a semantic search box** — the `match_articles` RPC
  already exists in your schema; right now the pipeline writes mock
  vectors, so this is disabled in the UI on purpose (a search box that
  returns nonsense results would undercut the project, not enhance it).
  Swapping the pipeline to Gemini's embedding model (free tier) would
  make this a genuinely worthwhile addition.
- **Light theme toggle** — the design tokens are centralized in
  `tailwind.config.js`, so a light palette is mostly a second color set
  away.
- **A couple of component tests** (React Testing Library) — good signal
  in a portfolio repo even at small scale; `NewsCard` and
  `StockMultiSelect` would be the highest-value first tests.
- **Screenshot/GIF in the repo README** — for a GitHub/resume audience,
  a visual at the top of the README matters more than most code changes.
