# Adjudge Core — Requirements

## Introduction

Adjudge is an AI-powered ad originality and effectiveness analyzer. It evaluates advertising creative against a corpus of historical ads using hybrid semantic search and multi-dimensional Claude-powered scoring.

## Requirements

### 1. Originality Analysis

**User Story:** As a creative director, I want to submit an ad and receive an originality score across four dimensions, so that I can know whether my work is truly original before presenting it to clients.

**Acceptance Criteria:**
- 1.1: Given a headline, body copy, industry, and media type, the system returns an overall originality score (0–100)
- 1.2: The score is broken into four weighted dimensions: Concept (40%), Language (25%), Strategy (20%), Execution (15%)
- 1.3: Each dimension includes a verdict label (HIGHLY ORIGINAL / ORIGINAL / DERIVATIVE / HIGHLY DERIVATIVE), score, and evidence list of similar prior ads
- 1.4: The analysis completes within 30 seconds for standard inputs
- 1.5: If the same headline is submitted verbatim with language match >90%, all dimension scores are penalized accordingly
- 1.6: Results include an industry benchmark comparison showing percentile rank against same-industry/media-type scores

### 2. AI Predictability Check

**User Story:** As a creative director with a brief, I want to know if my submitted creative matches what AI would have generated from the same brief, so that I can assess whether my agency is being genuinely creative or just prompting AI.

**Acceptance Criteria:**
- 2.1: Given a brief and submitted creative, the system generates 20 ranked campaign ideas (ideas 1–5 obvious, 16–20 experimental)
- 2.2: The submitted creative is compared to generated ideas and a predictability match percentage is returned
- 2.3: A penalty is applied to the originality score if creative matches a top-5 predictable idea
- 2.4: The predictability spectrum is displayed visually from "Agency Could Have Prompted AI" to "Genuinely Unexpected"

### 3. Effectiveness Prediction

**User Story:** As a copywriter, I want to receive a predicted effectiveness score for my ad, so that I can optimize it before it goes live.

**Acceptance Criteria:**
- 3.1: The system scores effectiveness across six dimensions: Attention, Persuasion, Brand Recall, Emotional Resonance, Clarity, Call to Action
- 3.2: Each dimension receives a score (0–100) and specific improvement suggestions
- 3.3: An overall performance tier is assigned: HIGH / ABOVE AVERAGE / AVERAGE / BELOW AVERAGE / LOW
- 3.4: Detected copywriting techniques are listed (e.g., "curiosity gap", "social proof", "urgency")

### 4. Claims Fact-Checking

**User Story:** As a brand manager, I want to verify the factual accuracy of marketing claims in an ad, so that I can ensure compliance and avoid false advertising liability.

**Acceptance Criteria:**
- 4.1: The system extracts all factual claims from submitted ad copy or uploaded image
- 4.2: Each claim receives a verdict: TRUE / MOSTLY TRUE / MISLEADING / UNVERIFIABLE / MOSTLY FALSE / FALSE
- 4.3: Supporting evidence links are provided for each verdict
- 4.4: Prior art ads making similar claims are surfaced

### 5. Brief Scoring

**User Story:** As a creative director, I want to evaluate a creative brief before sending it to agencies, so that I can predict whether it will produce generic or original work.

**Acceptance Criteria:**
- 5.1: The brief is scored across five dimensions with specific weaknesses identified
- 5.2: The system predicts agency convergence — will multiple agencies produce the same ideas?
- 5.3: The top 5 most predictable ideas that the brief would generate are shown
- 5.4: Actionable suggestions for sharpening the brief are provided

### 6. Idea Generation

**User Story:** As a strategist, I want to generate a range of campaign ideas from a brief, from obvious to experimental, so that I can explore the creative territory before briefing an agency.

**Acceptance Criteria:**
- 6.1: Given a brief, the system generates exactly 20 ranked campaign ideas
- 6.2: Ideas are ranked from most obvious/safe (1) to most experimental/unexpected (20)
- 6.3: Each idea includes a headline, concept summary, and why it lands at its rank
- 6.4: Ideas can optionally be checked against submitted creative for predictability scoring

### 7. Headline Comparison

**User Story:** As a copywriter, I want to compare multiple headline options side-by-side, so that I can identify which is most original and effective.

**Acceptance Criteria:**
- 7.1: Up to 10 headlines can be submitted for comparison
- 7.2: Headlines are ranked by originality
- 7.3: A similarity heatmap shows how closely each headline relates to the others
- 7.4: The winner is highlighted with reasoning

### 8. Authentication & Multi-Tenancy

**User Story:** As an agency principal, I want separate client accounts within a shared platform, so that each client's work remains confidential.

**Acceptance Criteria:**
- 8.1: Users register/login with email and password (bcrypt hashed)
- 8.2: Users are associated with a client/org via `client_id`
- 8.3: Campaign history is scoped to the authenticated user's client
- 8.4: Admin role can view all clients' data; user role can only view their own

### 9. Dashboard & Analytics

**User Story:** As an agency director, I want to see aggregate trends and benchmarks, so that I can track our creative output quality over time.

**Acceptance Criteria:**
- 9.1: Dashboard shows total campaigns analyzed, average originality score, top industry, score distribution
- 9.2: Industry benchmark comparisons show where scores fall relative to peers
- 9.3: Trend data shows score changes over time
- 9.4: Campaign history is searchable and filterable by industry, media type, date

### 10. File Upload & Extraction

**User Story:** As a creative professional, I want to upload PDFs, images, or PowerPoint files of my ad, so that I don't need to manually transcribe copy.

**Acceptance Criteria:**
- 10.1: PDF files are parsed and text extracted automatically
- 10.2: Images are sent to Claude vision for copy extraction
- 10.3: Extracted content is populated into the analysis form fields
- 10.4: Supported formats: PDF, JPG, PNG, WebP, PPTX
