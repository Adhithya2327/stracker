-- =====================================================================
-- STRACKER — Nifty 50 News Sentiment Tracker
-- Supabase / PostgreSQL Schema Setup Script
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------
-- Enables pgvector for storing and querying embeddings
create extension if not exists vector;

-- gen_random_uuid() lives in pgcrypto on some Postgres builds; Supabase
-- ships it enabled by default, but this makes the script portable.
create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------
-- 2. STOCKS MASTER TABLE
-- ---------------------------------------------------------------------
create table if not exists public.stocks (
    symbol          text primary key,
    company_name    text not null,
    exchange        text not null default 'NSE',
    sector          text
);

comment on table public.stocks is 'Master list of tracked Nifty 50 stocks.';


-- ---------------------------------------------------------------------
-- 3. ARTICLES TABLE
-- ---------------------------------------------------------------------
create table if not exists public.articles (
    id                  bigint generated always as identity primary key,
    title               text not null,
    content             text,
    source              text,
    published_at        timestamptz,
    ticker_symbol       text references public.stocks (symbol) on delete set null,
    sector              text,
    category            text,
    sentiment           text
        check (sentiment in ('BULLISH', 'BEARISH', 'NEUTRAL')),
    ai_impact_summary   text,
    is_systemic         boolean not null default false,
    embedding           vector(1536)
);

comment on table public.articles is 'News articles ingested and scored for the sentiment tracker.';
comment on column public.articles.is_systemic is 'True for macro/economy-wide news impacting the whole market rather than a single stock.';
comment on column public.articles.embedding is 'OpenAI text-embedding-3-small (or compatible) 1536-dim vector for semantic search.';

-- Helpful indexes for common query patterns
create index if not exists idx_articles_ticker_symbol on public.articles (ticker_symbol);
create index if not exists idx_articles_published_at on public.articles (published_at desc);
create index if not exists idx_articles_category on public.articles (category);
create index if not exists idx_articles_sentiment on public.articles (sentiment);

-- Vector similarity index (IVFFlat, cosine distance).
-- Note: IVFFlat indexes benefit from being built AFTER the table has data,
-- and `lists` should be tuned to roughly sqrt(row_count). 100 is a
-- reasonable starting point for a few thousand rows.
create index if not exists idx_articles_embedding_cosine
    on public.articles
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);


-- ---------------------------------------------------------------------
-- 4. WATCHLISTS TABLE (user preferences)
-- ---------------------------------------------------------------------
create table if not exists public.watchlists (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users (id) on delete cascade,
    ticker_symbol   text not null references public.stocks (symbol) on delete cascade,
    created_at      timestamptz not null default now(),
    unique (user_id, ticker_symbol)
);

comment on table public.watchlists is 'Per-user list of stocks they are tracking.';

create index if not exists idx_watchlists_user_id on public.watchlists (user_id);

-- Recommended: Row Level Security so users can only see/manage their own watchlist.
alter table public.watchlists enable row level security;

create policy "Users can view their own watchlist"
    on public.watchlists for select
    using (auth.uid() = user_id);

create policy "Users can add to their own watchlist"
    on public.watchlists for insert
    with check (auth.uid() = user_id);

create policy "Users can remove from their own watchlist"
    on public.watchlists for delete
    using (auth.uid() = user_id);


-- =====================================================================
-- 5. SEED DATA — stocks
-- =====================================================================
insert into public.stocks (symbol, company_name, exchange, sector)
values
    ('RELIANCE', 'Reliance Industries Limited', 'NSE', 'Energy'),
    ('SBIN', 'State Bank of India', 'NSE', 'Banking'),
    ('TCS', 'Tata Consultancy Services Limited', 'NSE', 'Technology'),
    ('BAJFINANCE', 'Bajaj Finance Limited', 'NSE', 'Financial Services'),
    ('LICI', 'Life Insurance Corporation Of India', 'NSE', 'Insurance'),
    ('LT', 'Larsen & Toubro Limited', 'NSE', 'Construction & Engineering'),
    ('HINDUNILVR', 'Hindustan Unilever Limited', 'NSE', 'FMCG'),
    ('INFY', 'Infosys Limited', 'NSE', 'Technology'),
    ('ADANIPOWER', 'Adani Power Limited', 'NSE', 'Energy'),
    ('ADANIPORTS', 'Adani Ports and Special Economic Zone Limited', 'NSE', 'Infrastructure')
on conflict (symbol) do update
    set company_name = excluded.company_name,
        exchange     = excluded.exchange,
        sector       = excluded.sector;


-- =====================================================================
-- 5b. FULL SEED DATA — all 50 stocks from Top_50_Indian_Stocks.xlsx
--     (Run this instead of / in addition to the sample above to load
--     the complete master list.)
-- =====================================================================
insert into public.stocks (symbol, company_name, exchange, sector)
values
    ('RELIANCE', 'Reliance Industries Limited', 'NSE', 'Energy'),
    ('SBIN', 'State Bank of India', 'NSE', 'Banking'),
    ('TCS', 'Tata Consultancy Services Limited', 'NSE', 'Technology'),
    ('BAJFINANCE', 'Bajaj Finance Limited', 'NSE', 'Financial Services'),
    ('LICI', 'Life Insurance Corporation Of India', 'NSE', 'Insurance'),
    ('LT', 'Larsen & Toubro Limited', 'NSE', 'Construction & Engineering'),
    ('HINDUNILVR', 'Hindustan Unilever Limited', 'NSE', 'FMCG'),
    ('INFY', 'Infosys Limited', 'NSE', 'Technology'),
    ('ADANIPOWER', 'Adani Power Limited', 'NSE', 'Energy'),
    ('ADANIPORTS', 'Adani Ports and Special Economic Zone Limited', 'NSE', 'Infrastructure'),
    ('M&M', 'Mahindra & Mahindra Limited', 'NSE', 'Automobile'),
    ('ADANIENT', 'Adani Enterprises Limited', 'NSE', 'Conglomerate'),
    ('ULTRACEMCO', 'UltraTech Cement Limited', 'NSE', 'Cement'),
    ('ITC', 'ITC Limited', 'NSE', 'FMCG'),
    ('NTPC', 'NTPC Limited', 'NSE', 'Energy'),
    ('HCLTECH', 'HCL Technologies Limited', 'NSE', 'Technology'),
    ('ONGC', 'Oil & Natural Gas Corporation Limited', 'NSE', 'Energy'),
    ('JSWSTEEL', 'JSW Steel Limited', 'NSE', 'Metals & Mining'),
    ('HAL', 'Hindustan Aeronautics Limited', 'NSE', 'Defence & Aerospace'),
    ('BAJAJFINSV', 'Bajaj Finserv Limited', 'NSE', 'Financial Services'),
    ('BAJAJ-AUTO', 'Bajaj Auto Limited', 'NSE', 'Automobile'),
    ('NESTLEIND', 'Nestle India Limited', 'NSE', 'FMCG'),
    ('BEL', 'Bharat Electronics Limited', 'NSE', 'Defence & Aerospace'),
    ('ETERNAL', 'Eternal Limited', 'NSE', 'Consumer Internet'),
    ('COALINDIA', 'Coal India Limited', 'NSE', 'Mining'),
    ('POWERGRID', 'Power Grid Corporation of India Limited', 'NSE', 'Energy'),
    ('DMART', 'Avenue Supermarts Limited', 'NSE', 'Retail'),
    ('ADANIGREEN', 'Adani Green Energy Limited', 'NSE', 'Renewable Energy'),
    ('SHRIRAMFIN', 'Shriram Finance Limited', 'NSE', 'Financial Services'),
    ('TATASTEEL', 'Tata Steel Limited', 'NSE', 'Metals & Mining'),
    ('HINDALCO', 'Hindalco Industries Limited', 'NSE', 'Metals & Mining'),
    ('GRASIM', 'Grasim Industries Limited', 'NSE', 'Cement'),
    ('EICHERMOT', 'Eicher Motors Limited', 'NSE', 'Automobile'),
    ('ADANIENSOL', 'Adani Energy Solutions Limited', 'NSE', 'Energy'),
    ('INDIGO', 'InterGlobe Aviation Limited', 'NSE', 'Aviation'),
    ('IOC', 'Indian Oil Corporation Limited', 'NSE', 'Energy'),
    ('SBILIFE', 'SBI Life Insurance Company Limited', 'NSE', 'Insurance'),
    ('WIPRO', 'Wipro Limited', 'NSE', 'Technology'),
    ('TORNTPHARM', 'Torrent Pharmaceuticals Limited', 'NSE', 'Pharmaceuticals'),
    ('SOLARINDS', 'Solar Industries India Limited', 'NSE', 'Chemicals & Defence'),
    ('HYUNDAI', 'Hyundai Motor India Limited', 'NSE', 'Automobile'),
    ('VBL', 'Varun Beverages Limited', 'NSE', 'FMCG'),
    ('JIOFIN', 'Jio Financial Services Limited', 'NSE', 'Financial Services'),
    ('CUMMINSIND', 'Cummins India Limited', 'NSE', 'Capital Goods'),
    ('TRENT', 'Trent Limited', 'NSE', 'Retail'),
    ('BSE', 'BSE Limited', 'NSE', 'Financial Services'),
    ('CHOLAFIN', 'Cholamandalam Investment and Finance Company Limited', 'NSE', 'Financial Services'),
    ('POWERINDIA', 'Hitachi Energy India Limited', 'NSE', 'Capital Goods'),
    ('MOTHERSON', 'Samvardhana Motherson International Limited', 'NSE', 'Auto Components'),
    ('CGPOWER', 'CG Power and Industrial Solutions Limited', 'NSE', 'Capital Goods')
on conflict (symbol) do update
    set company_name = excluded.company_name,
        exchange     = excluded.exchange,
        sector       = excluded.sector;


-- =====================================================================
-- 6. RPC FUNCTION — semantic vector search over articles
-- =====================================================================
create or replace function public.match_articles (
    query_embedding vector(1536),
    match_count int default 10
)
returns table (
    id                  bigint,
    title               text,
    content             text,
    source              text,
    published_at        timestamptz,
    ticker_symbol       text,
    sector              text,
    category            text,
    sentiment           text,
    ai_impact_summary   text,
    is_systemic         boolean,
    similarity          float
)
language sql
stable
as $$
    select
        a.id,
        a.title,
        a.content,
        a.source,
        a.published_at,
        a.ticker_symbol,
        a.sector,
        a.category,
        a.sentiment,
        a.ai_impact_summary,
        a.is_systemic,
        1 - (a.embedding <=> query_embedding) as similarity
    from public.articles a
    where a.embedding is not null
    order by a.embedding <=> query_embedding
    limit match_count;
$$;

comment on function public.match_articles is
    'Semantic search over articles using cosine distance (<=>) on the pgvector embedding column. Returns closest matches ordered by similarity (highest first).';
