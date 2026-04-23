# Adjudge Core — Technical Design

## Architecture Overview

Adjudge follows a Next.js App Router architecture with serverless API routes. All AI processing happens server-side; the frontend is a thin React client.

```
Browser (React) → Next.js API Routes → Claude + Search APIs → Postgres + Turbopuffer
```

## Component Hierarchy

```
app/
├── layout.tsx              # Root layout (nav, providers, theme)
├── page.tsx                # Home (hero + tool cards)
├── analyze/page.tsx        # Main originality analysis UI
├── effectiveness/page.tsx  # Creative performance prediction
├── claims/page.tsx         # Fact-checking
├── brief-score/page.tsx    # Brief evaluation
├── ideate/page.tsx         # Idea generation
├── compare/page.tsx        # Headline comparison
├── dashboard/page.tsx      # Analytics
└── api/
    ├── judge/route.ts       # POST: run originality analysis
    ├── effectiveness/route.ts
    ├── claims/route.ts
    ├── brief-score/route.ts
    ├── ideate/route.ts
    ├── compare/route.ts
    └── ...
```

## Core Data Flow: Originality Analysis

```
1. User submits form (headline, copy, industry, media_type, brief?)
2. POST /api/judge
3. deepSearch(headline, copy, industry, media_type)
   ├── Claude: decompose ad into semantic variants
   ├── Firecrawl: web search for prior art (parallel)
   ├── Voyage: embed semantic variants (rate-limited)
   ├── Turbopuffer: multi-pass vector + BM25 search
   ├── Postgres: pg_trgm fuzzy text search
   ├── Claude: re-rank, remove false positives
   └── Returns: { concept[], language[], strategy[], execution[] }
4. judgeOriginality(ad, matches) → Claude scores 4 dimensions
5. If brief provided: checkPredictability(brief, headline) → penalty
6. predictEffectiveness(ad) → 6D effectiveness scores
7. getIndustryBenchmark(industry, media_type, score)
8. Save verdict to Postgres
9. Return full result JSON
```

## Key Algorithms

### deepSearch() — 8-Phase Hybrid Search

| Phase | Operation | Tool |
|-------|-----------|------|
| 1 | Decompose ad into semantic facets + web queries | Claude |
| 2 | Parallel web search for prior art | Firecrawl |
| 3 | Batch embed semantic variants | Voyage AI |
| 4 | Multi-query vector + BM25 search | Turbopuffer |
| 5 | Industry-filtered vector search (strategy dimension) | Turbopuffer |
| 6 | Media-type filtered search (execution dimension) | Turbopuffer |
| 7 | Fuzzy text search (language dimension) | Postgres pg_trgm |
| 8 | Re-rank results, remove false positives | Claude |

### judgeOriginality() — Cross-Dimension Scoring Rules

- Language match >90% → all dimensions capped (verbatim copy)
- Concept match >80% → strategy & execution penalized
- No same-media matches → execution falls back to concept matches
- Predictability match (brief provided) → penalty applied to final score

### Benchmark Calculation

- Prefer same industry + media type (n≥3); fall back to industry-wide
- Percentile rank = % of existing scores this score beats
- Top 10% threshold = 90th percentile score

## Data Models

### Postgres Tables

```sql
campaigns(id, client_id, headline, body_copy, script, industry,
          media_type, language, brief, target_audience, objective, created_at)

ads(id, headline, body_copy, script, brand, agency, industry,
    media_type, language, year, country, source, source_url, created_at)

verdicts(id, campaign_id, score, verdict, reasoning,
         similar_ads JSONB, created_at)

users(id, email, name, password_hash, client_id, role, created_at)

clients(id, name, slug, created_at)
```

### Turbopuffer Vector Index

```
namespace: "adjudge-ads"
fields: id, vector(1024), headline, brand, industry, media_type, language
```

## API Contract: POST /api/judge

**Request:**
```json
{
  "headline": "string",
  "bodyCopy": "string",
  "script": "string (optional)",
  "industry": "string",
  "mediaType": "string",
  "language": "string",
  "brief": "string (optional)",
  "targetAudience": "string (optional)",
  "objective": "string (optional)"
}
```

**Response:**
```json
{
  "score": 73,
  "verdict": "ORIGINAL",
  "dimensions": {
    "concept": { "score": 80, "verdict": "ORIGINAL", "evidence": [...] },
    "language": { "score": 95, "verdict": "HIGHLY ORIGINAL", "evidence": [...] },
    "strategy": { "score": 60, "verdict": "DERIVATIVE", "evidence": [...] },
    "execution": { "score": 70, "verdict": "ORIGINAL", "evidence": [...] }
  },
  "effectiveness": { "overall": 78, "tier": "ABOVE AVERAGE", "dimensions": {...} },
  "predictability": { "score": 15, "matched_idea": null },
  "benchmark": { "percentile": 72, "industry_avg": 61, "top10_threshold": 88 },
  "similar_ads": [...]
}
```

## Environment Variables

```
NEON_DATABASE_URL        # Postgres connection string
TURBOPUFFER_API_KEY      # Vector search
VOYAGE_API_KEY           # Embeddings (voyage-multilingual-2)
FIRECRAWL_API_KEY        # Web search for prior art
ANTHROPIC_API_KEY        # Claude analysis
ELEVENLABS_API_KEY       # Voice verdicts (TTS + STT)
NEXTAUTH_SECRET          # JWT signing
NEXTAUTH_URL             # Auth callback URL
BLOB_READ_WRITE_TOKEN    # Netlify Blobs file storage
```
