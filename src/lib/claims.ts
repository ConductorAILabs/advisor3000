import Anthropic from "@anthropic-ai/sdk";
import { searchWeb } from "./firecrawl";
import { embedQuery } from "./voyage";
import { getNamespace } from "./turbopuffer";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClaimEvidence {
  url: string;
  title: string;
  relevant_text: string;
  supports_or_refutes: "supports" | "refutes" | "contextual";
}

export interface ClaimVerdict {
  claim: string;
  verdict: "TRUE" | "MOSTLY TRUE" | "MISLEADING" | "UNVERIFIABLE" | "MOSTLY FALSE" | "FALSE";
  confidence: number;
  summary: string;
  prior_art: {
    what: string;
    who: string;
    when: string;
    source_url?: string;
  }[];
  evidence: ClaimEvidence[];
  recommendation: string;
}

export interface ClaimsReport {
  overall_assessment: string;
  claims: ClaimVerdict[];
}

export async function extractClaimsFromImage(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text",
            text: `Extract ALL marketing claims, promotional statements, and verifiable assertions from this image. Include any claims about being "first", timelines, statistics, superlatives, endorsements, or competitive comparisons.

Return the extracted claims as plain text, one claim per line. If there are no marketing claims, return "No marketing claims found."`,
          },
        ],
      },
    ],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "No marketing claims found.";
}

export async function checkClaims(input: {
  claims_text: string;
  claimant?: string;
  context?: string;
}): Promise<ClaimsReport> {
  // Step 1: Extract individual claims with Claude
  const extractMsg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Extract each distinct factual claim from the following text. Focus on claims about being "first", "before", timelines, innovation claims, and any verifiable statements.

TEXT:
"${input.claims_text}"
${input.claimant ? `\nCLAIMANT: ${input.claimant}` : ""}
${input.context ? `\nCONTEXT: ${input.context}` : ""}

Return a JSON array of strings, each being one distinct claim. Return ONLY valid JSON.`,
      },
    ],
  });

  const claimsText = extractMsg.content[0].type === "text" ? extractMsg.content[0].text : "[]";
  let claims: string[];
  try {
    claims = JSON.parse(claimsText);
  } catch {
    claims = [input.claims_text];
  }

  // Step 2: Search for evidence on each claim (Turbopuffer cache first, then Firecrawl web)
  const claimVerdicts: ClaimVerdict[] = [];

  for (const claim of claims) {
    const allRawResults: string[] = [];
    const allSourceUrls: string[] = [];

    // 2a. Check Turbopuffer cached corpus for relevant ads
    try {
      const queryEmbedding = await embedQuery(claim);
      const ns = getNamespace();
      const cacheResults = await ns.query({
        rank_by: ["vector", "ANN", queryEmbedding],
        top_k: 5,
        distance_metric: "cosine_distance",
        include_attributes: true,
      });
      for (const row of cacheResults.rows ?? []) {
        const headline = row.headline ? String(row.headline) : "";
        const brand = row.brand ? String(row.brand) : "";
        if (headline) {
          allRawResults.push(`Cached ad: "${headline}" by ${brand} (industry: ${row.industry || "unknown"}, source: ${row.source || "unknown"})`);
          allSourceUrls.push("");
        }
      }
    } catch {
      // Turbopuffer namespace may not exist yet
    }

    // 2b. Search the open web via Firecrawl
    const searchQueries = [
      claim,
      claim.replace(/we |our |I /gi, "") + " history timeline first launched",
    ];

    for (const q of searchQueries) {
      try {
        const { raw_results, source_urls } = await searchWeb(q, 5);
        allRawResults.push(...raw_results);
        allSourceUrls.push(...source_urls);
      } catch {
        // search may fail, continue
      }
    }

    // Step 3: Have Claude analyze the evidence
    const combined = allRawResults
      .slice(0, 8)
      .map((content, i) => `--- SOURCE ${i + 1} (${allSourceUrls[i] || "unknown"}) ---\n${content.slice(0, 2000)}`)
      .join("\n\n");

    const analyzeMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a fact-checker for marketing claims. Analyze this claim against the evidence found.

CLAIM: "${claim}"
${input.claimant ? `CLAIMANT: ${input.claimant}` : ""}

EVIDENCE FOUND:
${combined || "No evidence found via web search."}

Assess the claim. Look specifically for:
1. Prior art — did someone else do this first?
2. Timeline accuracy — do the dates check out?
3. Superlative claims ("first ever", "before anyone") — are they true?
4. Missing context that changes the meaning

Return JSON:
{
  "claim": "${claim}",
  "verdict": "<TRUE | MOSTLY TRUE | MISLEADING | UNVERIFIABLE | MOSTLY FALSE | FALSE>",
  "confidence": <0-100, how confident you are in this verdict based on available evidence>,
  "summary": "<2-3 sentences explaining the verdict>",
  "prior_art": [{"what": "<what existed before>", "who": "<who made it>", "when": "<when>", "source_url": "<url if available>"}],
  "evidence": [{"url": "<source url>", "title": "<source title>", "relevant_text": "<key quote from source>", "supports_or_refutes": "<supports|refutes|contextual>"}],
  "recommendation": "<1 sentence: what the claimant should say instead to be accurate>"
}

Return ONLY valid JSON.`,
        },
      ],
    });

    const verdictText = analyzeMsg.content[0].type === "text" ? analyzeMsg.content[0].text : "{}";
    try {
      claimVerdicts.push(JSON.parse(verdictText));
    } catch {
      claimVerdicts.push({
        claim,
        verdict: "UNVERIFIABLE",
        confidence: 0,
        summary: "Could not analyze this claim due to a processing error.",
        prior_art: [],
        evidence: [],
        recommendation: "Rephrase this claim with specific, verifiable details.",
      });
    }
  }

  // Step 4: Overall assessment
  const overallMsg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Given these claim verdicts, write a 2-3 sentence overall assessment of the marketing claims' credibility:

${claimVerdicts.map((v) => `"${v.claim}" → ${v.verdict} (${v.confidence}% confidence)`).join("\n")}

Return a plain text assessment, not JSON.`,
      },
    ],
  });

  const overall = overallMsg.content[0].type === "text" ? overallMsg.content[0].text : "";

  return {
    overall_assessment: overall,
    claims: claimVerdicts,
  };
}
