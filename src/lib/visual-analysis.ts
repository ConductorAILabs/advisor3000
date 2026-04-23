import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";
import { embedQuery } from "./voyage";
import { getNamespace } from "./turbopuffer";
import { sql } from "./neon";
import type { SimilarAd } from "./claude";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface VisualAnalysis {
  visual_concept: string;
  art_direction: string;
  composition: string;
  emotional_tone: string;
  visual_techniques: string[];
  similar_to: string;
  searchable_description: string;
}

export async function analyzeVisualCreative(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  context?: { headline?: string; industry?: string; media_type?: string }
): Promise<VisualAnalysis> {
  const contextBlock = context
    ? `\nCONTEXT:\n${context.headline ? `- Headline: "${context.headline}"` : ""}${context.industry ? `\n- Industry: ${context.industry}` : ""}${context.media_type ? `\n- Media Type: ${context.media_type}` : ""}`
    : "";

  const message = await client.messages.create({
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
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are an expert advertising creative director and visual analyst. Analyze this ad image/storyboard as an advertising professional would.
${contextBlock}
Focus on the visual concept and creative techniques, not just listing objects. Identify the strategic intent behind every visual choice.

Return JSON:
{
  "visual_concept": "<the core visual idea, metaphor, or narrative expressed through the imagery — 1-2 sentences>",
  "art_direction": "<style, color palette, typography approach, photographic or illustrative style — 1-2 sentences>",
  "composition": "<layout, visual hierarchy, focal points, use of space, how the eye moves — 1-2 sentences>",
  "emotional_tone": "<the mood and feeling conveyed by the visuals — 1 sentence>",
  "visual_techniques": ["<technique 1>", "<technique 2>", ...],
  "similar_to": "<what famous ads, campaigns, or visual styles this resembles — 1-2 sentences>",
  "searchable_description": "<a single dense paragraph combining ALL visual elements — concept, style, composition, mood, techniques, industry context — optimized for semantic search and embedding. Include specific visual descriptors, color terms, compositional terms, and advertising technique names. Make it keyword-rich.>"
}

For visual_techniques, use specific advertising terminology like: "split screen", "product hero shot", "lifestyle photography", "bold typography", "minimal whitespace", "before-after", "flat lay", "macro close-up", "user-generated style", "cinematic lighting", "duotone", "hand-drawn illustration", "collage", "gradient overlay", "testimonial format", "comparison grid", etc.

Return ONLY valid JSON.`,
          },
        ],
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  return parseClaudeJSON(text);
}

export async function searchVisualSimilarity(
  analysis: VisualAnalysis
): Promise<SimilarAd[]> {
  const embedding = await embedQuery(analysis.searchable_description);

  const ns = getNamespace();
  let rows: { id: unknown; $dist?: number; [k: string]: unknown }[] = [];
  try {
    const response = await ns.query({
      rank_by: ["vector", "ANN", embedding],
      top_k: 15,
      distance_metric: "cosine_distance",
      include_attributes: true,
    });
    rows = response.rows ?? [];
  } catch {
    return [];
  }

  const ids = rows
    .map((r) => {
      const idStr = String(r.id);
      if (idStr.startsWith("ad-")) return parseInt(idStr.replace("ad-", ""));
      return null;
    })
    .filter((id): id is number => id !== null);

  if (ids.length === 0) return [];

  const uniqueIds = [...new Set(ids)];
  const dbRows = await sql.query(
    `SELECT id, headline, brand, agency, industry, year, media_type, script, body_copy, source_url, country, language
     FROM ads WHERE id = ANY($1)`,
    [uniqueIds]
  );

  return dbRows.map((row: Record<string, unknown>) => {
    const match = rows.find((r) => String(r.id) === `ad-${row.id}`);
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
