import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SimilarAd {
  headline: string;
  brand: string;
  industry: string;
  year: number;
  media_type: string;
  script?: string;
  body_copy?: string;
  similarity_score: number;
  source_url?: string;
  country?: string;
  language?: string;
  agency?: string;
  match_type: "concept" | "language" | "strategy" | "execution";
}

export interface EvidenceItem {
  ad_headline: string;
  ad_brand: string;
  agency?: string;
  industry: string;
  media_type: string;
  year?: number;
  country?: string;
  language?: string;
  similarity_pct: number;
  overlap: string;
  source_url?: string;
}

export interface DimensionScore {
  score: number;
  explanation: string;
  ads_searched: number;
  evidence: EvidenceItem[];
}

export interface AdjudgeVerdict {
  overall_score: number;
  verdict: string;
  summary: string;
  total_ads_compared: number;
  search_sources: string[];
  dimensions: {
    concept: DimensionScore;
    language: DimensionScore;
    strategy: DimensionScore;
    execution: DimensionScore;
  };
  methodology: string;
}

function formatMatch(ad: SimilarAd, i: number): string {
  const parts = [
    `  ${i + 1}. "${ad.headline}" by ${ad.brand}`,
    ad.agency ? `(agency: ${ad.agency})` : null,
    `[${ad.industry}, ${ad.media_type}]`,
    ad.year ? `year: ${ad.year}` : null,
    ad.country ? `country: ${ad.country}` : null,
    ad.language ? `lang: ${ad.language}` : null,
    `— ${(ad.similarity_score * 100).toFixed(1)}% similar`,
    ad.source_url ? `[${ad.source_url}]` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

export async function judgeOriginality(
  userAd: {
    headline: string;
    body_copy?: string;
    script?: string;
    industry: string;
    media_type: string;
  },
  signals: {
    concept_matches: SimilarAd[];
    language_matches: SimilarAd[];
    strategy_matches: SimilarAd[];
    execution_matches: SimilarAd[];
  }
): Promise<AdjudgeVerdict> {
  const totalAds = new Set([
    ...signals.concept_matches.map((a) => a.headline),
    ...signals.language_matches.map((a) => a.headline),
    ...signals.strategy_matches.map((a) => a.headline),
    ...signals.execution_matches.map((a) => a.headline),
  ]).size;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `You are the Adjudge scoring engine — a proprietary ad originality analyzer. You score ads across 4 dimensions and provide transparent, evidence-based reasoning with full metadata on every match.

SUBMITTED AD:
- Headline: "${userAd.headline}"
- Industry: ${userAd.industry}
- Media Type: ${userAd.media_type}
${userAd.body_copy ? `- Body Copy: "${userAd.body_copy}"` : ""}
${userAd.script ? `- Script: "${userAd.script}"` : ""}

DIMENSION 1 — CONCEPT (weight: 40%)
Is the core idea/metaphor/narrative unique? Most semantically similar ads:
${signals.concept_matches.length > 0 ? signals.concept_matches.map((ad, i) => formatMatch(ad, i)).join("\n") : "  No similar concepts found in corpus."}

DIMENSION 2 — LANGUAGE (weight: 25%)
Are the exact words, phrases, or linguistic patterns original? Closest textual matches:
${signals.language_matches.length > 0 ? signals.language_matches.map((ad, i) => formatMatch(ad, i)).join("\n") : "  No exact text matches found."}

DIMENSION 3 — STRATEGY (weight: 20%)
Is this positioning/angle unique within ${userAd.industry}? Similar industry ads:
${signals.strategy_matches.length > 0 ? signals.strategy_matches.map((ad, i) => formatMatch(ad, i)).join("\n") : "  No similar industry-specific strategies found."}

DIMENSION 4 — EXECUTION (weight: 15%)
Is the format/approach novel for ${userAd.media_type}? Similar media type ads:
${signals.execution_matches.length > 0 ? signals.execution_matches.map((ad, i) => formatMatch(ad, i)).join("\n") : "  No similar executions found for this specific media type."}

CROSS-REFERENCE: All matches found across ALL dimensions (for context):
${[...signals.concept_matches, ...signals.language_matches, ...signals.strategy_matches].slice(0, 5).map((ad, i) => formatMatch(ad, i)).join("\n") || "  None."}

CRITICAL SCORING RULES:
- Each dimension: 0-100 (100 = completely original, 0 = direct copy)
- If no matches found for a dimension, lean toward 75-90 (original but unverified, not 100)
- If matches are found but weak (<50% similarity), score 65-85
- If matches are strong (>70% similarity), score 20-50 and cite specifically
- If near-identical match exists (>90%), score 0-20
- Overall = concept*0.40 + language*0.25 + strategy*0.20 + execution*0.15

IMPORTANT — CROSS-DIMENSION INHERITANCE:
- If a LANGUAGE match is >90% (near-verbatim copy), then ALL dimensions must score low (0-25). A verbatim copy of an existing ad is derivative regardless of whether it's in the same media type, industry, or format. Do NOT give a high execution score just because the exact same headline hasn't been used in this specific media type before — the ad itself is a copy.
- If a CONCEPT match is >80%, execution and strategy should also be penalized unless the execution is genuinely novel.
- The execution dimension should reference matches from OTHER dimensions if no same-media-type matches exist. A campaign running as "digital" that's identical to an existing "video" campaign is still derivative.

For each dimension's evidence array, include the 1-3 most relevant matching ads with FULL metadata. Preserve all available details (year, country, language, agency, media_type, industry, similarity percentage). If a field is not available from the data above, use "unknown" for strings and 0 for numbers.

Respond with this exact JSON structure:
{
  "overall_score": <number>,
  "verdict": "<HIGHLY ORIGINAL | MOSTLY ORIGINAL | SOMEWHAT DERIVATIVE | HIGHLY DERIVATIVE>",
  "summary": "<2-3 sentence executive summary for the client>",
  "total_ads_compared": ${totalAds},
  "search_sources": ["Turbopuffer vector index", "Neon Postgres text search", "Firecrawl web search"],
  "dimensions": {
    "concept": {
      "score": <number>,
      "explanation": "<2-3 sentences on why this concept score>",
      "ads_searched": ${signals.concept_matches.length},
      "evidence": [{
        "ad_headline": "...",
        "ad_brand": "...",
        "agency": "<agency or 'unknown'>",
        "industry": "<industry>",
        "media_type": "<media type>",
        "year": <year or 0>,
        "country": "<country or 'unknown'>",
        "language": "<language code or 'unknown'>",
        "similarity_pct": <0-100 similarity percentage>,
        "overlap": "<specific description of what overlaps conceptually>",
        "source_url": "<MUST include the URL from the match data above if one was provided. This lets users verify the prior art themselves. Use null only if no URL exists.>"
      }]
    },
    "language": { same structure, "ads_searched": ${signals.language_matches.length} },
    "strategy": { same structure, "ads_searched": ${signals.strategy_matches.length} },
    "execution": { same structure, "ads_searched": ${signals.execution_matches.length} }
  },
  "methodology": "<1 sentence: how many ads were compared, from which sources. Always note that results reflect the discoverable public record, not all advertising ever produced.>"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return parseClaudeJSON(text);
}
