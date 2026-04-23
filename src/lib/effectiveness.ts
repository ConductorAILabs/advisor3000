import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface EffectivenessScore {
  overall: number;
  dimensions: {
    attention: { score: number; explanation: string };
    persuasion: { score: number; explanation: string };
    brand_recall: { score: number; explanation: string };
    emotional_resonance: { score: number; explanation: string };
    clarity: { score: number; explanation: string };
    call_to_action: { score: number; explanation: string };
  };
  predicted_performance: "HIGH" | "ABOVE AVERAGE" | "AVERAGE" | "BELOW AVERAGE" | "LOW";
  improvement_suggestions: string[];
  copywriting_techniques_used: string[];
  copywriting_techniques_missing: string[];
}

export async function predictEffectiveness(ad: {
  headline: string;
  body_copy?: string;
  script?: string;
  industry: string;
  media_type: string;
}): Promise<EffectivenessScore> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are an experienced direct response copywriter and creative director with 25+ years analyzing ad performance. You have deep expertise in persuasion psychology, behavioral economics, and advertising effectiveness research (Ehrenberg-Bass, IPA databank, System1 testing).

Analyze this ad for predicted creative effectiveness:

SUBMITTED AD:
- Headline: "${ad.headline}"
- Industry: ${ad.industry}
- Media Type: ${ad.media_type}
${ad.body_copy ? `- Body Copy: "${ad.body_copy}"` : ""}
${ad.script ? `- Script: "${ad.script}"` : ""}

Score each dimension 0-100:

1. ATTENTION (weight 25%): Will it stop the scroll? Does it pattern-interrupt? Is the opening arresting? Does it create curiosity or intrigue?

2. PERSUASION (weight 25%): Does it use proven persuasion techniques? Social proof, authority, scarcity, reciprocity, commitment/consistency, liking? Are claims supported? Is there a logical argument structure?

3. BRAND RECALL (weight 20%): Will people remember the brand after seeing this? Are distinctive brand assets present? Is the brand integral to the idea or just bolted on? Would this work for a competitor?

4. EMOTIONAL RESONANCE (weight 15%): Does it evoke feeling? Which emotions? Is there tension/resolution? Does it connect to fundamental human desires or fears?

5. CLARITY (weight 10%): Is the core message immediately clear? Can you state the proposition in one sentence? Is it simple enough to understand in the first exposure?

6. CALL TO ACTION (weight 5%): Is there a clear next step? Is the CTA specific and compelling? Is there urgency or reason to act now?

COPYWRITING TECHNIQUES TO CHECK FOR:
social proof, urgency, scarcity, specificity, power words, emotional triggers, pattern interrupt, storytelling, metaphor, analogy, contrast, before/after, future pacing, risk reversal, authority positioning, curiosity gap, open loop, rhyme/rhythm, alliteration, rule of three, direct address, sensory language, benefit-led copy, problem-agitation-solution, AIDA framework, unique mechanism

Calculate overall = attention*0.25 + persuasion*0.25 + brand_recall*0.20 + emotional_resonance*0.15 + clarity*0.10 + call_to_action*0.05

Determine predicted_performance:
- 80-100: "HIGH"
- 65-79: "ABOVE AVERAGE"
- 50-64: "AVERAGE"
- 35-49: "BELOW AVERAGE"
- 0-34: "LOW"

Respond with this exact JSON structure:
{
  "overall": <number>,
  "dimensions": {
    "attention": { "score": <number>, "explanation": "<1-2 sentences>" },
    "persuasion": { "score": <number>, "explanation": "<1-2 sentences>" },
    "brand_recall": { "score": <number>, "explanation": "<1-2 sentences>" },
    "emotional_resonance": { "score": <number>, "explanation": "<1-2 sentences>" },
    "clarity": { "score": <number>, "explanation": "<1-2 sentences>" },
    "call_to_action": { "score": <number>, "explanation": "<1-2 sentences>" }
  },
  "predicted_performance": "<HIGH | ABOVE AVERAGE | AVERAGE | BELOW AVERAGE | LOW>",
  "improvement_suggestions": ["<specific actionable suggestion 1>", "<2>", "<3>", "<4>", "<5>"],
  "copywriting_techniques_used": ["<technique1>", "<technique2>"],
  "copywriting_techniques_missing": ["<technique1>", "<technique2>"]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return parseClaudeJSON(text);
}
