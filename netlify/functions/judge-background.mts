import type { BackgroundHandler } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import { searchAds } from "../../src/lib/firecrawl";
import { extractAdsFromContent, cacheAds } from "../../src/lib/extract-ads";
import { judgeOriginality } from "../../src/lib/claude";
import { generateIdeas, checkPredictability } from "../../src/lib/ideate";
import { deepSearch } from "../../src/lib/deep-search";
import { getIndustryBenchmark } from "../../src/lib/benchmarks";
import { predictEffectiveness } from "../../src/lib/effectiveness";

export const handler: BackgroundHandler = async (event) => {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const { job_id, campaign_id } = JSON.parse(event.body || "{}");
  if (!job_id || !campaign_id) return;

  try {
    const campaigns = await sql`SELECT * FROM campaigns WHERE id = ${campaign_id}`;
    const campaign = campaigns[0];
    if (!campaign) throw new Error("campaign not found");

    const headline = campaign.headline as string;
    const body_copy = campaign.body_copy as string | undefined;
    const script = campaign.script as string | undefined;
    const industry = campaign.industry as string;
    const media_type = campaign.media_type as string;
    const brief = campaign.brief as string | undefined;
    const target_audience = campaign.target_audience as string | undefined;
    const objective = campaign.objective as string | undefined;

    // Pre-crawl if corpus is thin
    let corpusCount = 0;
    try {
      const countResult = await sql`SELECT COUNT(*) as count FROM ads`;
      corpusCount = Number(countResult[0].count);
    } catch { /* empty corpus */ }

    if (corpusCount < 10) {
      try {
        const { raw_results, source_urls } = await searchAds(headline, { industry });
        if (raw_results.length > 0) {
          const extractedAds = await extractAdsFromContent(raw_results, source_urls, headline);
          await cacheAds(extractedAds);
        }
      } catch (err) { console.error("Pre-judge crawl failed:", err); }
    }

    const searchResults = await deepSearch({ headline, body_copy, script, industry, media_type });

    let predictability = {
      is_predictable: false,
      closest_match_index: null as number | null,
      closest_match_headline: null as string | null,
      similarity_explanation: brief ? "Predictability check was not run." : "No brief provided — predictability check requires the original client brief to generate competing ideas from the same starting point.",
      predictability_tier: "none" as "top5" | "top10" | "top15" | "top20" | "none",
      penalty: 0,
      ideas: [] as { headline: string; concept: string; tone: string; media_approach: string }[],
      brief_provided: !!brief,
    };

    if (brief) {
      try {
        const ideation = await generateIdeas({
          product: brief,
          industry,
          target_audience: target_audience || "general",
          objective: objective || "brand awareness",
          media_type,
        });
        const conceptText = [headline, body_copy, script].filter(Boolean).join(". ");
        const predCheck = await checkPredictability(headline, conceptText, ideation.ideas);
        predictability = { ...predCheck, ideas: ideation.ideas, brief_provided: true };
      } catch (err) { console.error("Predictability check failed:", err); }
    }

    const verdict = await judgeOriginality(
      { headline, body_copy, script, industry, media_type },
      {
        concept_matches: searchResults.concept_matches,
        language_matches: searchResults.language_matches,
        strategy_matches: searchResults.strategy_matches,
        execution_matches: searchResults.execution_matches,
      },
    );

    const adjustedScore = Math.round(Math.max(1, Math.min(100, verdict.overall_score + predictability.penalty)));
    const adjustedVerdict = adjustedScore >= 80 ? "HIGHLY ORIGINAL"
      : adjustedScore >= 60 ? "MOSTLY ORIGINAL"
      : adjustedScore >= 40 ? "SOMEWHAT DERIVATIVE"
      : "HIGHLY DERIVATIVE";

    let benchmarkData;
    try {
      benchmarkData = await getIndustryBenchmark(industry, media_type, adjustedScore);
    } catch (err) { console.error("Benchmark lookup failed:", err); }

    let effectivenessData;
    try {
      effectivenessData = await predictEffectiveness({ headline, body_copy, script, industry, media_type });
    } catch (err) { console.error("Effectiveness prediction failed:", err); }

    const finalVerdict = {
      ...verdict,
      overall_score: adjustedScore,
      pre_penalty_score: verdict.overall_score,
      verdict: adjustedVerdict,
      predictability,
      benchmark: benchmarkData,
      effectiveness: effectivenessData,
      search_metadata: {
        total_queries_run: searchResults.total_queries_run,
        total_candidates_found: searchResults.total_candidates_found,
        total_after_rerank: searchResults.total_after_rerank,
      },
    };

    await sql`DELETE FROM verdicts WHERE campaign_id = ${campaign_id}`;
    await sql`
      INSERT INTO verdicts (campaign_id, score, verdict, reasoning, similar_ads)
      VALUES (${campaign_id}, ${adjustedScore}, ${adjustedVerdict}, ${verdict.summary}, ${JSON.stringify(finalVerdict)})
    `;

    await sql`UPDATE jobs SET status = 'complete', result = ${JSON.stringify(finalVerdict)} WHERE id = ${job_id}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await sql`UPDATE jobs SET status = 'error', error = ${msg} WHERE id = ${job_id}`;
    } catch { /* ignore */ }
  }
};
