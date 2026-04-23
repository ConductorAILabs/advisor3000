# Adjudge Core — Implementation Tasks

## Status Legend
- [ ] Not started
- [x] Complete

---

## Phase 1: Foundation

- [x] 1.1 Initialize Next.js 16 project with TypeScript and Tailwind CSS 4
- [x] 1.2 Set up Neon Postgres with schema.sql (campaigns, ads, verdicts, users, clients)
- [x] 1.3 Configure NextAuth with credentials provider and bcrypt password hashing
- [x] 1.4 Set up Turbopuffer client with adjudge-ads namespace
- [x] 1.5 Set up Voyage AI embedding client with rate-limit retry logic
- [x] 1.6 Set up Firecrawl client for web search and scraping
- [x] 1.7 Configure Netlify deployment with next.js plugin

## Phase 2: Core Analysis Pipeline

- [x] 2.1 Implement `deepSearch()` — 8-phase hybrid search (src/lib/deep-search.ts)
  - [x] 2.1.1 Phase 1: Claude ad decomposition into semantic variants
  - [x] 2.1.2 Phase 2: Parallel Firecrawl web searches
  - [x] 2.1.3 Phase 3: Batch Voyage embedding of variants
  - [x] 2.1.4 Phase 4: Multi-pass Turbopuffer vector + BM25 search
  - [x] 2.1.5 Phases 5–6: Industry + media-type filtered searches
  - [x] 2.1.6 Phase 7: Postgres pg_trgm fuzzy text search
  - [x] 2.1.7 Phase 8: Claude re-ranking to remove false positives
- [x] 2.2 Implement `judgeOriginality()` — 4D Claude scoring with cross-dimension rules (src/lib/claude.ts)
- [x] 2.3 Implement `checkPredictability()` — brief-vs-creative comparison with penalty (src/lib/ideate.ts)
- [x] 2.4 Implement `predictEffectiveness()` — 6D effectiveness scoring (src/lib/effectiveness.ts)
- [x] 2.5 Implement `getIndustryBenchmark()` — percentile rank calculation (src/lib/benchmarks.ts)
- [x] 2.6 Build POST /api/judge route orchestrating all above (src/app/api/judge/route.ts)

## Phase 3: Supporting Features

- [x] 3.1 Implement `checkClaims()` — claims extraction + fact-checking (src/lib/claims.ts)
- [x] 3.2 Implement `scoreBrief()` — brief evaluation + convergence prediction (src/lib/brief-score.ts)
- [x] 3.3 Implement `generateIdeas()` — 20 ranked campaign ideas (src/lib/ideate.ts)
- [x] 3.4 Implement headline comparison with similarity heatmap (src/app/api/compare/route.ts)
- [x] 3.5 Implement file upload and extraction — PDF, image, PPTX (src/lib/file-extract.ts)

## Phase 4: Frontend

- [x] 4.1 Build home page with hero and tool cards (src/app/page.tsx)
- [x] 4.2 Build originality analysis page with form and results (src/app/analyze/page.tsx)
- [x] 4.3 Build effectiveness prediction page (src/app/effectiveness/page.tsx)
- [x] 4.4 Build claims fact-checking page (src/app/claims/page.tsx)
- [x] 4.5 Build brief scoring page (src/app/brief-score/page.tsx)
- [x] 4.6 Build idea generation page (src/app/ideate/page.tsx)
- [x] 4.7 Build headline comparison page (src/app/compare/page.tsx)
- [x] 4.8 Build dashboard with analytics and benchmarks (src/app/dashboard/page.tsx)
- [x] 4.9 Build AnimatedGauge component for score visualization (src/components/animated-gauge.tsx)
- [x] 4.10 Build DimensionDisplay component for 4D breakdown cards
- [x] 4.11 Build Predictability spectrum component
- [x] 4.12 Add dark mode with next-themes

## Phase 5: Voice Verdict (ElevenLabs Integration)

- [x] 5.1 Add ELEVENLABS_API_KEY to environment configuration
- [x] 5.2 Create ElevenLabs service module (src/lib/elevenlabs.ts)
  - [x] 5.2.1 TTS: synthesizeVerdict(text, voiceId) → audio blob
  - [x] 5.2.2 STT: transcribeBrief(audioBlob) → text
  - [x] 5.2.3 Sound Effects: generateSoundEffect(prompt) → audio blob
- [x] 5.3 Build POST /api/voice/verdict route — generates voiced verdict from analysis result
- [x] 5.4 Build POST /api/voice/transcribe route — transcribes voice input to text
- [x] 5.5 Add VoiceVerdict component to analyze results page
  - [x] 5.5.1 "Hear Verdict" button that streams TTS audio
  - [x] 5.5.2 Judge voice reads score, dimension summary, and key evidence
- [x] 5.6 Add VoiceInput component to brief and headline input fields
  - [x] 5.6.1 Microphone button that records audio
  - [x] 5.6.2 Transcription populates the text field
- [x] 5.7 Style audio player with waveform visualization
