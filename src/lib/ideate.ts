import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface CampaignIdea {
  headline: string;
  concept: string;
  tone: string;
  media_approach: string;
}

export interface IdeationResult {
  ideas: CampaignIdea[];
}

export async function generateIdeas(brief: {
  product: string;
  industry: string;
  target_audience: string;
  objective: string;
  media_type: string;
  tone?: string;
  constraints?: string;
}): Promise<IdeationResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior creative director at a top advertising agency. Given this brief, generate exactly 20 campaign ideas. These should range from the most obvious/expected ideas (#1-5) to increasingly creative and unexpected ones (#16-20).

BRIEF:
- Product/Brand: ${brief.product}
- Industry: ${brief.industry}
- Target Audience: ${brief.target_audience}
- Campaign Objective: ${brief.objective}
- Media Type: ${brief.media_type}
${brief.tone ? `- Desired Tone: ${brief.tone}` : ""}
${brief.constraints ? `- Constraints: ${brief.constraints}` : ""}

IMPORTANT: Ideas #1-5 should be the most predictable, conventional approaches any agency would think of first. Ideas #6-10 should be solid but less obvious. Ideas #11-15 should show real creative stretch. Ideas #16-20 should be genuinely surprising or unconventional.

Return a JSON object:
{
  "ideas": [
    {
      "headline": "<the campaign headline/tagline>",
      "concept": "<1-2 sentence description of the core idea>",
      "tone": "<emotional tone: e.g. inspiring, humorous, provocative, etc>",
      "media_approach": "<how this would execute in ${brief.media_type}>"
    }
  ]
}

Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  return parseClaudeJSON(text);
}

export interface PredictabilityResult {
  is_predictable: boolean;
  closest_match_index: number | null;
  closest_match_headline: string | null;
  similarity_explanation: string;
  predictability_tier: "top5" | "top10" | "top15" | "top20" | "none";
  penalty: number;
}

export async function checkPredictability(
  submittedHeadline: string,
  submittedConcept: string,
  ideas: CampaignIdea[]
): Promise<PredictabilityResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are evaluating whether a submitted ad campaign is predictable — meaning an AI could independently arrive at essentially the same idea.

SUBMITTED CAMPAIGN:
- Headline: "${submittedHeadline}"
- Concept: "${submittedConcept}"

AI-GENERATED IDEAS (ordered from most obvious #1 to most creative #20):
${ideas.map((idea, i) => `${i + 1}. "${idea.headline}" — ${idea.concept}`).join("\n")}

Does the submitted campaign closely match any of the AI-generated ideas? A "match" means the core concept is essentially the same, even if the exact words differ.

Return JSON:
{
  "is_predictable": <true if any idea is conceptually very close to the submission>,
  "closest_match_index": <1-20 index of closest match, or null if no match>,
  "closest_match_headline": "<headline of closest match, or null>",
  "similarity_explanation": "<1-2 sentences explaining what overlaps or why there's no match>",
  "predictability_tier": "<'top5' if matches ideas 1-5, 'top10' for 6-10, 'top15' for 11-15, 'top20' for 16-20, 'none' if no match>",
  "penalty": <score penalty: top5=-30, top10=-20, top15=-10, top20=-5, none=0>
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  return parseClaudeJSON(text);
}
