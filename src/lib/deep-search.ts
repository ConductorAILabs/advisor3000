import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";
import { embed, embedQuery } from "./voyage";
import { getNamespace } from "./turbopuffer";
import { sql } from "./neon";
import { multiSearchAds, scrapeTopResults } from "./firecrawl";
import { extractAdsFromContent, cacheAds } from "./extract-ads";
import type { SimilarAd } from "./claude";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface DecomposedAd {
  headline_embedding: number[];
  concept_embedding: number[];
  tone_embedding: number[];
  structure_embedding: number[];
  semantic_variants: string[];
  cross_language_queries: string[];
  firecrawl_queries: string[];
  core_concept: string;
}

interface DeepSearchResult {
  concept_matches: SimilarAd[];
  language_matches: SimilarAd[];
  strategy_matches: SimilarAd[];
  execution_matches: SimilarAd[];
  total_queries_run: number;
  total_candidates_found: number;
  total_after_rerank: number;
  web_ads_discovered: number;
}

export async function decomposeAd(ad: {
  headline: string;
  body_copy?: string;
  script?: string;
  industry: string;
  media_type: string;
}): Promise<DecomposedAd> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Decompose this ad into searchable semantic facets. I need to find similar ads across multiple dimensions AND generate web search queries to find prior art.

AD:
- Headline: "${ad.headline}"
${ad.body_copy ? `- Body Copy: "${ad.body_copy}"` : ""}
${ad.script ? `- Script: "${ad.script}"` : ""}
- Industry: ${ad.industry}
- Media Type: ${ad.media_type}

Return JSON:
{
  "core_concept": "<the underlying idea/metaphor in 1-2 sentences, stripped of brand specifics>",
  "emotional_tone": "<the emotional register and mood in 1 sentence>",
  "structural_pattern": "<the rhetorical/structural technique: e.g. 'imperative command', 'question-answer', 'before-after', 'metaphor comparison', 'list of three'>",
  "semantic_variants": [
    "<rephrase 1: same idea, completely different words>",
    "<rephrase 2: same idea, different angle>",
    "<rephrase 3: the opposite/contrarian version>",
    "<rephrase 4: how a competitor would express this>",
    "<rephrase 5: the cliche version>"
  ],
  "cross_language_queries": [
    "<core concept for Spanish-language advertising>",
    "<core concept for French-language advertising>",
    "<core concept for German-language advertising>",
    "<universal concept searchable in any language>"
  ],
  "firecrawl_queries": [
    "<search query 1: the exact headline + 'ad campaign' + brand names known for similar work>",
    "<search query 2: the core concept + '${ad.industry} advertising' + 'award winning'>",
    "<search query 3: the structural technique + '${ad.media_type} ad' + 'famous' + 'best'>",
    "<search query 4: '${ad.industry} ad slogans taglines' + key concept words>",
    "<search query 5: the emotional tone + '${ad.industry} campaign' + 'cannes lions' OR 'D&AD' OR 'one show'>"
  ]
}

The firecrawl_queries should be optimized for Google search — use quotes for exact phrases, include relevant award show names, agency names, or brand names that would have done similar work. These queries will search the entire web for prior art.

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const decomposition = parseClaudeJSON<{
    core_concept?: string;
    emotional_tone?: string;
    structural_pattern?: string;
    semantic_variants?: string[];
    cross_language_queries?: string[];
    firecrawl_queries?: string[];
  }>(text);

  const textsToEmbed = [
    ad.headline,
    decomposition.core_concept || ad.headline,
    decomposition.emotional_tone || ad.headline,
    decomposition.structural_pattern || ad.headline,
  ];

  const embeddings = await embed(textsToEmbed);

  return {
    headline_embedding: embeddings[0],
    concept_embedding: embeddings[1],
    tone_embedding: embeddings[2],
    structure_embedding: embeddings[3],
    semantic_variants: decomposition.semantic_variants || [],
    cross_language_queries: decomposition.cross_language_queries || [],
    firecrawl_queries: decomposition.firecrawl_queries || [],
    core_concept: decomposition.core_concept || ad.headline,
  };
}

async function vectorSearch(
  embedding: number[],
  topK: number,
  filters?: ["industry" | "media_type" | "language", "Eq", string]
): Promise<{ id: unknown; $dist?: number; [k: string]: unknown }[]> {
  const ns = getNamespace();
  try {
    const response = await ns.query({
      rank_by: ["vector", "ANN", embedding],
      top_k: topK,
      distance_metric: "cosine_distance",
      filters: filters || undefined,
      include_attributes: true,
    });
    return response.rows ?? [];
  } catch {
    return [];
  }
}

async function bm25Search(
  text: string,
  topK: number,
  filters?: ["industry" | "media_type" | "language", "Eq", string]
): Promise<{ id: unknown; $dist?: number; [k: string]: unknown }[]> {
  const ns = getNamespace();
  try {
    const response = await ns.query({
      rank_by: ["headline", "BM25", text],
      top_k: topK,
      filters: filters || undefined,
      include_attributes: true,
    });
    return response.rows ?? [];
  } catch {
    return [];
  }
}

function extractAdIds(rows: { id: unknown }[]): number[] {
  return rows
    .map((r) => {
      const idStr = String(r.id);
      if (idStr.startsWith("ad-")) return parseInt(idStr.replace("ad-", ""));
      return null;
    })
    .filter((id): id is number => id !== null);
}

async function fetchAdsByIds(ids: number[], vectorRows: { id: unknown; $dist?: number }[]): Promise<SimilarAd[]> {
  if (ids.length === 0) return [];
  const dbRows = await sql.query(
    `SELECT id, headline, brand, agency, industry, year, media_type, script, body_copy, source_url, country, language
     FROM ads WHERE id = ANY($1)`,
    [ids],
  );
  return dbRows.map((row: Record<string, unknown>) => {
    const match = vectorRows.find((r) => String(r.id) === `ad-${row.id}`);
    return {
      headline: row.headline as string,
      brand: (row.brand as string) || "Unknown",
      agency: row.agency as string | undefined,
      industry: (row.industry as string) || "other",
      year: (row.year as number) || 0,
      media_type: (row.media_type as string) || "digital",
      script: row.script as string | undefined,
      body_copy: row.body_copy as string | undefined,
      source_url: row.source_url as string | undefined,
      country: row.country as string | undefined,
      language: row.language as string | undefined,
      similarity_score: match?.$dist != null ? 1 - match.$dist : 0,
      match_type: "concept" as const,
    };
  });
}

async function rerankWithClaude(
  userAd: { headline: string; body_copy?: string; script?: string },
  candidates: SimilarAd[],
  dimension: string
): Promise<SimilarAd[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= 3) return candidates;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Re-rank these ad matches by relevance to the submitted ad for the "${dimension}" dimension. Remove false positives.

SUBMITTED AD: "${userAd.headline}"${userAd.body_copy ? ` — ${userAd.body_copy}` : ""}

CANDIDATES:
${candidates.map((c, i) => `${i}. "${c.headline}" by ${c.brand} (${c.industry}, ${c.year || "?"}) [sim: ${(c.similarity_score * 100).toFixed(0)}%]`).join("\n")}

Return a JSON array of indices (0-based) of top matches, ordered by true relevance. Remove false positives. Max 8.
Return ONLY the JSON array.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const indices = parseClaudeJSON<number[]>(text);
    return indices.filter((i) => i >= 0 && i < candidates.length).map((i) => candidates[i]);
  } catch {
    return candidates.slice(0, 8);
  }
}

function deduplicateAds(ads: SimilarAd[]): SimilarAd[] {
  const seen = new Set<string>();
  return ads.filter((ad) => {
    const key = `${ad.headline}|${ad.brand}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyRecencyWeight(ads: SimilarAd[]): SimilarAd[] {
  const currentYear = new Date().getFullYear();
  return ads.map((ad) => {
    if (!ad.year || ad.year === 0) return ad;
    const age = currentYear - ad.year;
    const recencyMultiplier = age <= 3 ? 1.15 : age <= 5 ? 1.0 : age <= 10 ? 0.9 : 0.8;
    return { ...ad, similarity_score: Math.min(1, ad.similarity_score * recencyMultiplier) };
  }).sort((a, b) => b.similarity_score - a.similarity_score);
}

export async function deepSearch(ad: {
  headline: string;
  body_copy?: string;
  script?: string;
  industry: string;
  media_type: string;
  visual_description?: string;
}): Promise<DeepSearchResult> {
  let totalQueries = 0;
  let totalCandidates = 0;
  let webAdsDiscovered = 0;

  // === PHASE 1: DECOMPOSE ===
  const decomposed = await decomposeAd(ad);

  // === PHASE 2: FIRECRAWL WEB SEARCH (runs in parallel with embedding) ===
  // Search the web with decomposed queries — not just the headline
  const webSearchPromise = (async () => {
    try {
      const { raw_results, source_urls } = await multiSearchAds(
        decomposed.firecrawl_queries,
        3,
      );

      if (raw_results.length > 0) {
        // Extract ads from search results
        const extracted = await extractAdsFromContent(raw_results, source_urls, ad.headline);

        if (extracted.length > 0) {
          // Scrape top URLs for deeper content
          const { contents, urls: scrapedUrls } = await scrapeTopResults(source_urls, 2);
          if (contents.length > 0) {
            const deepExtracted = await extractAdsFromContent(contents, scrapedUrls, ad.headline);
            extracted.push(...deepExtracted);
          }

          // Cache everything we found
          const savedIds = await cacheAds(extracted);
          webAdsDiscovered = savedIds.length;
        }
      }
    } catch (err) {
      console.error("Web search phase failed:", err);
    }
  })();

  // === PHASE 3: BATCH EMBED VARIANTS (runs in parallel with web search) ===
  const allExtraTexts = [
    ...decomposed.semantic_variants,
    ...decomposed.cross_language_queries,
  ];
  const embeddingPromise = allExtraTexts.length > 0 ? embed(allExtraTexts) : Promise.resolve([]);

  // Wait for both web search and embedding to complete
  const [, variantEmbeddings] = await Promise.all([webSearchPromise, embeddingPromise]);

  const variantEmbs = variantEmbeddings.slice(0, decomposed.semantic_variants.length);
  const crossLangEmbs = variantEmbeddings.slice(decomposed.semantic_variants.length);

  // === PHASE 4: VECTOR + BM25 SEARCH (now searches enriched corpus) ===
  const [
    headlineResults,
    conceptResults,
    // BM25 text search on headline field
    bm25HeadlineResults,
    bm25ConceptResults,
    ...variantResults
  ] = await Promise.all([
    vectorSearch(decomposed.headline_embedding, 15).then((r) => { totalQueries++; return r; }),
    vectorSearch(decomposed.concept_embedding, 15).then((r) => { totalQueries++; return r; }),
    bm25Search(ad.headline, 10).then((r) => { totalQueries++; return r; }),
    bm25Search(decomposed.core_concept, 10).then((r) => { totalQueries++; return r; }),
    ...variantEmbs.map(async (emb) => {
      totalQueries++;
      return vectorSearch(emb, 8);
    }),
  ]);

  const crossLangResults = await Promise.all(
    crossLangEmbs.map(async (emb) => {
      totalQueries++;
      return vectorSearch(emb, 5);
    }),
  );

  // Tone + structure searches
  const [toneResults, structureResults] = await Promise.all([
    vectorSearch(decomposed.tone_embedding, 10).then((r) => { totalQueries++; return r; }),
    vectorSearch(decomposed.structure_embedding, 10).then((r) => { totalQueries++; return r; }),
  ]);

  // Industry-filtered searches (concept + tone)
  const [strategyConceptResults, strategyToneResults] = await Promise.all([
    vectorSearch(decomposed.concept_embedding, 10, ["industry", "Eq", ad.industry]).then((r) => { totalQueries++; return r; }),
    vectorSearch(decomposed.tone_embedding, 10, ["industry", "Eq", ad.industry]).then((r) => { totalQueries++; return r; }),
  ]);

  // Media-type filtered searches
  const [executionConceptResults, executionStructureResults] = await Promise.all([
    vectorSearch(decomposed.concept_embedding, 10, ["media_type", "Eq", ad.media_type]).then((r) => { totalQueries++; return r; }),
    vectorSearch(decomposed.structure_embedding, 10, ["media_type", "Eq", ad.media_type]).then((r) => { totalQueries++; return r; }),
  ]);

  // Visual description searches (if provided)
  let visualUnfilteredRows: { id: unknown; $dist?: number; [k: string]: unknown }[] = [];
  let visualIndustryRows: { id: unknown; $dist?: number; [k: string]: unknown }[] = [];
  if (ad.visual_description) {
    const visualEmb = await embedQuery(ad.visual_description);
    const [unfilteredRes, industryRes] = await Promise.all([
      vectorSearch(visualEmb, 10).then((r) => { totalQueries++; return r; }),
      vectorSearch(visualEmb, 10, ["industry", "Eq", ad.industry]).then((r) => { totalQueries++; return r; }),
    ]);
    visualUnfilteredRows = unfilteredRes;
    visualIndustryRows = industryRes;
  }

  // === PHASE 5: MERGE + DEDUPLICATE ===
  const allConceptRows = [
    ...headlineResults, ...conceptResults,
    ...bm25HeadlineResults, ...bm25ConceptResults,
    ...variantResults.flat(), ...crossLangResults.flat(),
    ...visualUnfilteredRows,
  ];
  const allStrategyRows = [...strategyConceptResults, ...strategyToneResults, ...visualIndustryRows];
  // If execution search found nothing, fall back to concept matches — a copy is derivative regardless of format
  let allExecutionRows = [...executionConceptResults, ...executionStructureResults];
  if (allExecutionRows.length === 0) {
    allExecutionRows = [...allConceptRows.slice(0, 10)];
  }

  totalCandidates = allConceptRows.length + toneResults.length + allStrategyRows.length + allExecutionRows.length;

  const conceptIds = extractAdIds(allConceptRows);
  const strategyIds = extractAdIds(allStrategyRows);
  const executionIds = extractAdIds(allExecutionRows);

  const [rawConceptAds, rawStrategyAds, rawExecutionAds] = await Promise.all([
    fetchAdsByIds([...new Set(conceptIds)], allConceptRows),
    fetchAdsByIds([...new Set(strategyIds)], allStrategyRows),
    fetchAdsByIds([...new Set(executionIds)], allExecutionRows),
  ]);

  const dedupedConcept = deduplicateAds(rawConceptAds);
  const dedupedStrategy = deduplicateAds(rawStrategyAds);
  const dedupedExecution = deduplicateAds(rawExecutionAds);

  // === PHASE 6: CLAUDE RE-RANK ===
  const [conceptMatches, strategyMatches, executionMatches] = await Promise.all([
    rerankWithClaude(ad, dedupedConcept, "concept"),
    rerankWithClaude(ad, dedupedStrategy, "strategy"),
    rerankWithClaude(ad, dedupedExecution, "execution"),
  ]);

  // === PHASE 7: RECENCY WEIGHT ===
  const weightedConcept = applyRecencyWeight(conceptMatches);
  const weightedStrategy = applyRecencyWeight(strategyMatches);
  const weightedExecution = applyRecencyWeight(executionMatches);

  // === PHASE 8: LANGUAGE MATCHES (Neon pg_trgm) ===
  let languageMatches: SimilarAd[] = [];
  try {
    const allSearchTerms = [ad.headline, ...decomposed.semantic_variants];
    const textResults = [];

    for (const term of allSearchTerms.slice(0, 3)) {
      const termSearch = `%${term}%`;
      const results = await sql`
        SELECT id, headline, brand, agency, industry, year, media_type, script, body_copy, source_url, country, language,
               similarity(headline, ${term}) AS headline_sim
        FROM ads
        WHERE headline ILIKE ${termSearch}
           OR similarity(headline, ${term}) > 0.12
        ORDER BY headline_sim DESC
        LIMIT 8
      `;
      textResults.push(...results);
    }

    const searchTerm = `%${ad.headline}%`;
    const bodyResults = await sql`
      SELECT id, headline, brand, agency, industry, year, media_type, script, body_copy, source_url, country, language,
             similarity(headline, ${ad.headline}) AS headline_sim
      FROM ads
      WHERE body_copy ILIKE ${searchTerm} OR script ILIKE ${searchTerm}
      ORDER BY headline_sim DESC
      LIMIT 5
    `;
    textResults.push(...bodyResults);

    const seen = new Set<number>();
    languageMatches = textResults
      .filter((row: Record<string, unknown>) => {
        const id = row.id as number;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((row: Record<string, unknown>) => ({
        headline: row.headline as string,
        brand: (row.brand as string) || "Unknown",
        agency: row.agency as string | undefined,
        industry: (row.industry as string) || "other",
        year: (row.year as number) || 0,
        media_type: (row.media_type as string) || "digital",
        script: row.script as string | undefined,
        body_copy: row.body_copy as string | undefined,
        source_url: row.source_url as string | undefined,
        country: row.country as string | undefined,
        language: row.language as string | undefined,
        similarity_score: Number(row.headline_sim) || 0,
        match_type: "language" as const,
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10);
  } catch { /* pg_trgm may fail on empty table */ }

  // Tag match types
  weightedConcept.forEach((m) => (m.match_type = "concept"));
  weightedStrategy.forEach((m) => (m.match_type = "strategy"));
  weightedExecution.forEach((m) => (m.match_type = "execution"));

  const totalAfterRerank = weightedConcept.length + languageMatches.length + weightedStrategy.length + weightedExecution.length;

  return {
    concept_matches: weightedConcept,
    language_matches: languageMatches,
    strategy_matches: weightedStrategy,
    execution_matches: weightedExecution,
    total_queries_run: totalQueries,
    total_candidates_found: totalCandidates,
    total_after_rerank: totalAfterRerank,
    web_ads_discovered: webAdsDiscovered,
  };
}
