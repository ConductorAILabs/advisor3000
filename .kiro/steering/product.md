# Adjudge — Product Overview

Adjudge is an AI-powered ad originality and effectiveness platform for advertising professionals. It evaluates creative work across multiple dimensions — originality, effectiveness, predictability, and claims accuracy — and now delivers verdicts via voice using ElevenLabs.

## Core Value Proposition

"Creative Reality Check" — before you present to a client, know whether your ad is truly original or just a remix of what came before.

## Target Users

- Creative directors at ad agencies
- Brand managers reviewing agency submissions
- Copywriters stress-testing their own work
- Creative strategists evaluating briefs

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **AI Analysis:** Anthropic Claude (claude-sonnet-4-6)
- **Audio:** ElevenLabs (TTS voice verdicts, STT brief input)
- **Search:** Voyage AI embeddings + Turbopuffer vector DB + Firecrawl web search
- **Database:** Neon Postgres (pg_trgm fuzzy search)
- **Auth:** NextAuth with multi-tenant client/org model
- **Deploy:** Netlify
