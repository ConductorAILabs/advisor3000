-- Adjudge: Ad Originality Platform
-- Run this against your Neon database to set up the schema

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Clients / organizations using the platform
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ad campaigns submitted by clients for originality checking
CREATE TABLE IF NOT EXISTS campaigns (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id),
  headline    TEXT NOT NULL,
  body_copy   TEXT,
  script      TEXT,
  industry    TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK (media_type IN ('print', 'video', 'radio', 'digital', 'social', 'outdoor')),
  language    TEXT DEFAULT 'en',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Historical ads from scraped/ingested sources (the corpus)
CREATE TABLE IF NOT EXISTS ads (
  id          SERIAL PRIMARY KEY,
  headline    TEXT NOT NULL,
  body_copy   TEXT,
  script      TEXT,
  brand       TEXT,
  agency      TEXT,
  industry    TEXT,
  media_type  TEXT,
  language    TEXT DEFAULT 'en',
  year        INTEGER,
  country     TEXT,
  source      TEXT NOT NULL,
  source_url  TEXT,
  media_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Originality verdicts from Claude
CREATE TABLE IF NOT EXISTS verdicts (
  id            SERIAL PRIMARY KEY,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 100),
  verdict       TEXT NOT NULL,
  reasoning     TEXT NOT NULL,
  similar_ads   JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_ads_headline_trgm ON ads USING gin (headline gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ads_script_trgm ON ads USING gin (script gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ads_industry ON ads (industry);
CREATE INDEX IF NOT EXISTS idx_ads_language ON ads (language);
CREATE INDEX IF NOT EXISTS idx_ads_year ON ads (year);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns (client_id);

-- Users for authentication
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT NOT NULL,
  client_id     INTEGER REFERENCES clients(id),
  role          TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
