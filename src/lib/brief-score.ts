import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";
import { generateIdeas } from "./ideate";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface BriefScoreResult {
  overall_score: number;
  verdict: "SHARP" | "DECENT" | "GENERIC" | "VAGUE";
  summary: string;
  dimensions: {
    specificity: { score: number; explanation: string };
    differentiation: { score: number; explanation: string };
    creative_latitude: { score: number; explanation: string };
    measurability: { score: number; explanation: string };
    audience_clarity: { score: number; explanation: string };
  };
  predicted_agency_convergence: number; // 0-100: how likely agencies will produce the same ideas
  convergence_explanation: string;
  top_5_predictable_ideas: string[]; // the 5 most obvious ideas any agency would produce from this brief
  rewrite_suggestions: string[]; // specific ways to sharpen the brief
  sharpened_brief: string; // a rewritten version of the brief
}

export async function scoreBrief(brief: {
  description: string;
  industry: string;
  target_audience: string;
  objective: string;
  media_type: string;
  tone?: string;
  constraints?: string;
  budget_context?: string;
}): Promise<BriefScoreResult> {
  // Step 1: Score the brief itself
  const scoreMsg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior creative strategist evaluating a client brief BEFORE it goes to an agency. Your job is to predict whether this brief will produce original work or generic work.

BRIEF:
- Description: "${brief.description}"
- Industry: ${brief.industry}
- Target Audience: ${brief.target_audience}
- Objective: ${brief.objective}
- Media Type: ${brief.media_type}
${brief.tone ? `- Desired Tone: ${brief.tone}` : ""}
${brief.constraints ? `- Constraints: ${brief.constraints}` : ""}
${brief.budget_context ? `- Budget Context: ${brief.budget_context}` : ""}

Score the brief across 5 dimensions:

1. SPECIFICITY (0-100): Does the brief give enough specific direction? "Increase brand awareness" is vague. "Make 25-34 year old urban renters feel that our insurance understands their lifestyle" is specific.

2. DIFFERENTIATION (0-100): Does the brief articulate what makes this brand/product DIFFERENT? If you removed the brand name, could this brief be for any competitor? That's a 0.

3. CREATIVE LATITUDE (0-100): Does the brief leave room for surprising creative work? Too prescriptive = formulaic output. Too open = unfocused output. The sweet spot gives clear guardrails with room to surprise.

4. MEASURABILITY (0-100): Can you tell when the campaign has succeeded? Vague objectives produce vague work.

5. AUDIENCE CLARITY (0-100): Is the target audience described as real humans with real motivations, or as a demographic spreadsheet?

Then predict AGENCY CONVERGENCE: If you gave this brief to 10 different agencies, what percentage would produce essentially the same campaign? High convergence = generic brief.

Also generate the 5 most predictable/obvious campaign ideas any agency would produce from this brief.

Also provide 3-5 specific suggestions for sharpening the brief, and write a sharpened version.

Overall = specificity*0.25 + differentiation*0.25 + creative_latitude*0.20 + measurability*0.15 + audience_clarity*0.15

Return JSON:
{
  "overall_score": <number>,
  "verdict": "<SHARP if 80+, DECENT if 60-79, GENERIC if 40-59, VAGUE if below 40>",
  "summary": "<2-3 sentence assessment of this brief's quality>",
  "dimensions": {
    "specificity": { "score": <number>, "explanation": "<2 sentences>" },
    "differentiation": { "score": <number>, "explanation": "<2 sentences>" },
    "creative_latitude": { "score": <number>, "explanation": "<2 sentences>" },
    "measurability": { "score": <number>, "explanation": "<2 sentences>" },
    "audience_clarity": { "score": <number>, "explanation": "<2 sentences>" }
  },
  "predicted_agency_convergence": <0-100>,
  "convergence_explanation": "<2 sentences on why agencies will/won't converge>",
  "top_5_predictable_ideas": ["<idea 1>", "<idea 2>", "<idea 3>", "<idea 4>", "<idea 5>"],
  "rewrite_suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
  "sharpened_brief": "<a rewritten version of the brief that would score 80+>"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = scoreMsg.content[0].type === "text" ? scoreMsg.content[0].text : "{}";
  return parseClaudeJSON(text);
}
