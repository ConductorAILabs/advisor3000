import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";
import { sql } from "./neon";
import { embed } from "./voyage";
import { getNamespace } from "./turbopuffer";
import type { CrawledAd } from "./firecrawl";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function extractAdsFromContent(
  rawContent: string[],
  sourceUrls: string[],
  searchQuery: string
): Promise<CrawledAd[]> {
  const combined = rawContent
    .map((content, i) => `--- SOURCE ${i + 1} (${sourceUrls[i] || "unknown"}) ---\n${content}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Extract all distinct ad campaigns from the following web content. The user searched for: "${searchQuery}"

For each ad campaign you can identify, extract:
- headline (the main tagline/slogan)
- body_copy (any additional copy text)
- script (if it's a video/radio ad script)
- brand (the advertiser/company)
- agency (the ad agency if mentioned)
- industry (one of: automotive, tech, fmcg, finance, healthcare, retail, food, fashion, travel, entertainment, other)
- media_type (one of: print, video, radio, digital, social, outdoor)
- language (ISO 639-1 code, e.g. "en", "es", "fr")
- year (if mentioned or inferrable)
- country (if mentioned)
- source_index (which SOURCE number, 0-indexed)

Return a JSON array of objects. If no ads are found, return [].
Return ONLY valid JSON, no other text.

WEB CONTENT:
${combined.slice(0, 15000)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";

  let parsed: Array<CrawledAd & { source_index?: number }>;
  try {
    parsed = parseClaudeJSON(text);
  } catch {
    return [];
  }

  return parsed.map((ad) => ({
    headline: ad.headline || "",
    body_copy: ad.body_copy,
    script: ad.script,
    brand: ad.brand || "Unknown",
    agency: ad.agency,
    industry: ad.industry || "other",
    media_type: ad.media_type || "digital",
    language: ad.language || "en",
    year: ad.year,
    country: ad.country,
    source_url: sourceUrls[ad.source_index ?? 0] || "",
    source: "firecrawl",
  }));
}

export async function cacheAds(ads: CrawledAd[]): Promise<number[]> {
  if (ads.length === 0) return [];

  const savedIds: number[] = [];

  for (const ad of ads) {
    if (!ad.headline) continue;

    const existing = await sql`
      SELECT id FROM ads WHERE headline = ${ad.headline} AND brand = ${ad.brand} LIMIT 1
    `;
    if (existing.length > 0) {
      savedIds.push(existing[0].id);
      continue;
    }

    const [row] = await sql`
      INSERT INTO ads (headline, body_copy, script, brand, agency, industry, media_type, language, year, country, source, source_url)
      VALUES (${ad.headline}, ${ad.body_copy ?? null}, ${ad.script ?? null}, ${ad.brand}, ${ad.agency ?? null}, ${ad.industry}, ${ad.media_type}, ${ad.language}, ${ad.year ?? null}, ${ad.country ?? null}, ${ad.source}, ${ad.source_url})
      RETURNING id
    `;

    savedIds.push(row.id);
  }

  const toEmbed = ads
    .filter((ad) => ad.headline)
    .map((ad) => [ad.headline, ad.body_copy, ad.script].filter(Boolean).join(" | "));

  if (toEmbed.length > 0) {
    const embeddings = await embed(toEmbed);
    const ns = getNamespace();

    await ns.write({
      upsert_rows: savedIds.map((id, i) => ({
        id: `ad-${id}`,
        vector: embeddings[i],
        headline: ads[i].headline,
        brand: ads[i].brand,
        industry: ads[i].industry,
        media_type: ads[i].media_type,
        language: ads[i].language,
        source: "firecrawl",
        type: "historical",
      })),
      distance_metric: "cosine_distance",
    });
  }

  return savedIds;
}
