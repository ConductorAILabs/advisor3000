import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { embedQuery } from "@/lib/voyage";
import { getNamespace } from "@/lib/turbopuffer";
import { searchAds } from "@/lib/firecrawl";
import { extractAdsFromContent, cacheAds } from "@/lib/extract-ads";
import type { Filter } from "@turbopuffer/turbopuffer";

export async function POST(req: NextRequest) {
  const { query, industry, language, media_type, exact, page = 1, per_page = 20 } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.max(1, Math.min(100, Number(per_page)));

  const results: {
    vector: unknown[];
    exact: unknown[];
    web: unknown[];
    cached_count: number;
    total_vector: number;
    total_exact: number;
    page: number;
    per_page: number;
  } = {
    vector: [],
    exact: [],
    web: [],
    cached_count: 0,
    total_vector: 0,
    total_exact: 0,
    page: pageNum,
    per_page: perPage,
  };

  // 1. Vector similarity search against cached corpus (Turbopuffer)
  const queryEmbedding = await embedQuery(query);
  const ns = getNamespace();

  const filterClauses: Filter[] = [];
  if (industry) filterClauses.push(["industry", "Eq", industry]);
  if (language) filterClauses.push(["language", "Eq", language]);
  if (media_type) filterClauses.push(["media_type", "Eq", media_type]);

  try {
    // Turbopuffer doesn't support offset, so fetch enough results and slice
    const vectorTopK = pageNum * perPage;
    const queryResponse = await ns.query({
      rank_by: ["vector", "ANN", queryEmbedding],
      top_k: vectorTopK,
      distance_metric: "cosine_distance",
      filters: filterClauses.length > 0 ? ["And", filterClauses] : undefined,
      include_attributes: true,
    });

    const allVectorRows = (queryResponse.rows ?? []).map((r) => ({
      id: r.id,
      similarity: r.$dist != null ? 1 - r.$dist : 0,
      headline: r.headline,
      brand: r.brand,
      industry: r.industry,
      media_type: r.media_type,
      language: r.language,
      source: r.source,
    }));

    results.total_vector = allVectorRows.length;
    const vectorStart = (pageNum - 1) * perPage;
    results.vector = allVectorRows.slice(vectorStart, vectorStart + perPage);
  } catch {
    // Namespace may not exist yet on first search
  }

  // 2. Exact text match via Neon pg_trgm
  if (exact) {
    const searchTerm = `%${query}%`;
    const limit = perPage;
    const offset = (pageNum - 1) * perPage;
    try {
      // Get total count for exact matches
      const countResult = industry
        ? await sql`
            SELECT COUNT(*) AS total
            FROM ads
            WHERE (headline ILIKE ${searchTerm} OR script ILIKE ${searchTerm} OR body_copy ILIKE ${searchTerm})
              AND industry = ${industry}`
        : await sql`
            SELECT COUNT(*) AS total
            FROM ads
            WHERE headline ILIKE ${searchTerm} OR script ILIKE ${searchTerm} OR body_copy ILIKE ${searchTerm}`;

      results.total_exact = Number(countResult[0]?.total ?? 0);

      const exactResults = industry
        ? await sql`
            SELECT id, headline, body_copy, brand, agency, industry, media_type, language, year, source_url,
                   similarity(headline, ${query}) AS headline_sim
            FROM ads
            WHERE (headline ILIKE ${searchTerm} OR script ILIKE ${searchTerm} OR body_copy ILIKE ${searchTerm})
              AND industry = ${industry}
            ORDER BY headline_sim DESC LIMIT ${limit} OFFSET ${offset}`
        : await sql`
            SELECT id, headline, body_copy, brand, agency, industry, media_type, language, year, source_url,
                   similarity(headline, ${query}) AS headline_sim
            FROM ads
            WHERE headline ILIKE ${searchTerm} OR script ILIKE ${searchTerm} OR body_copy ILIKE ${searchTerm}
            ORDER BY headline_sim DESC LIMIT ${limit} OFFSET ${offset}`;

      results.exact = exactResults;
    } catch {
      // pg_trgm may not have data yet
    }
  }

  // 3. If cache has few results, crawl the web and cache new ads
  const cachedTotal = results.vector.length + results.exact.length;
  if (cachedTotal < 5) {
    try {
      const { raw_results, source_urls } = await searchAds(query, { industry, language });

      if (raw_results.length > 0) {
        const extractedAds = await extractAdsFromContent(raw_results, source_urls, query);
        const savedIds = await cacheAds(extractedAds);
        results.cached_count = savedIds.length;

        results.web = extractedAds.map((ad) => ({
          headline: ad.headline,
          brand: ad.brand,
          agency: ad.agency,
          industry: ad.industry,
          media_type: ad.media_type,
          language: ad.language,
          year: ad.year,
          source_url: ad.source_url,
          source: "web-search",
        }));
      }
    } catch (err) {
      console.error("Web search failed:", err);
    }
  }

  return NextResponse.json(results);
}
