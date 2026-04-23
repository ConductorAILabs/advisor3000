import { sql } from "@/lib/neon";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface TrendItem {
  term: string;
  count: number;
  growth_pct: number;
  industries: string[];
  example_headlines: string[];
}

export interface TrendReport {
  period: string;
  rising_themes: TrendItem[];
  declining_themes: TrendItem[];
  top_words: { word: string; count: number }[];
  industry_shifts: {
    industry: string;
    avg_score: number;
    trend: "up" | "down" | "stable";
  }[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "for", "of", "in", "to", "and", "or", "with", "your", "our", "you",
  "we", "it", "its", "this", "that", "on", "at", "by", "from", "as",
  "but", "not", "no", "all", "do", "does", "did", "has", "have", "had",
  "will", "can", "could", "would", "should", "may", "might", "so",
  "if", "than", "then", "too", "very", "just", "about", "up", "out",
  "new", "one", "get", "got", "make", "like", "more", "most", "how",
  "what", "when", "where", "who", "why", "which", "every", "each",
  "they", "them", "their", "he", "she", "his", "her", "my", "me",
  "us", "am", "im", "i", "dont", "cant", "wont", "lets", "its",
  "&", "-", "–", "—", "|",
]);

async function getWordFrequencies(
  days: number,
  offset: number,
  industry?: string
): Promise<Map<string, { count: number; headlines: string[]; industries: string[] }>> {
  const rows = industry
    ? await sql`
        SELECT word, COUNT(*) as cnt,
          array_agg(DISTINCT headline) as headlines,
          array_agg(DISTINCT industry) as industries
        FROM (
          SELECT regexp_split_to_table(lower(headline), '\\s+') as word, headline, industry
          FROM ads
          WHERE created_at >= NOW() - make_interval(days => ${offset + days})
            AND created_at < NOW() - make_interval(days => ${offset})
            AND industry = ${industry}
        ) tokens
        WHERE length(word) > 2
        GROUP BY word
        ORDER BY cnt DESC
        LIMIT 200
      `
    : await sql`
        SELECT word, COUNT(*) as cnt,
          array_agg(DISTINCT headline) as headlines,
          array_agg(DISTINCT industry) as industries
        FROM (
          SELECT regexp_split_to_table(lower(headline), '\\s+') as word, headline, industry
          FROM ads
          WHERE created_at >= NOW() - make_interval(days => ${offset + days})
            AND created_at < NOW() - make_interval(days => ${offset})
        ) tokens
        WHERE length(word) > 2
        GROUP BY word
        ORDER BY cnt DESC
        LIMIT 200
      `;

  const map = new Map<string, { count: number; headlines: string[]; industries: string[] }>();
  for (const row of rows) {
    const word = row.word as string;
    if (STOP_WORDS.has(word)) continue;
    map.set(word, {
      count: Number(row.cnt),
      headlines: (row.headlines as string[]).slice(0, 3),
      industries: [...new Set(row.industries as string[])].filter(Boolean),
    });
  }
  return map;
}

async function getIndustryShifts(
  days: number,
  industry?: string
): Promise<TrendReport["industry_shifts"]> {
  const currentRows = industry
    ? await sql`
        SELECT a.industry, AVG(v.score) as avg_score
        FROM verdicts v
        JOIN campaigns c ON c.id = v.campaign_id
        JOIN ads a ON lower(a.headline) = lower(c.headline)
        WHERE v.created_at >= NOW() - make_interval(days => ${days})
          AND a.industry = ${industry}
        GROUP BY a.industry
      `
    : await sql`
        SELECT c.industry, AVG(v.score) as avg_score
        FROM verdicts v
        JOIN campaigns c ON c.id = v.campaign_id
        WHERE v.created_at >= NOW() - make_interval(days => ${days})
          AND c.industry IS NOT NULL
        GROUP BY c.industry
        ORDER BY avg_score DESC
        LIMIT 10
      `;

  const previousRows = industry
    ? await sql`
        SELECT a.industry, AVG(v.score) as avg_score
        FROM verdicts v
        JOIN campaigns c ON c.id = v.campaign_id
        JOIN ads a ON lower(a.headline) = lower(c.headline)
        WHERE v.created_at >= NOW() - make_interval(days => ${2 * days})
          AND v.created_at < NOW() - make_interval(days => ${days})
          AND a.industry = ${industry}
        GROUP BY a.industry
      `
    : await sql`
        SELECT c.industry, AVG(v.score) as avg_score
        FROM verdicts v
        JOIN campaigns c ON c.id = v.campaign_id
        WHERE v.created_at >= NOW() - make_interval(days => ${2 * days})
          AND v.created_at < NOW() - make_interval(days => ${days})
          AND c.industry IS NOT NULL
        GROUP BY c.industry
      `;

  const prevMap = new Map<string, number>();
  for (const row of previousRows) {
    prevMap.set(row.industry as string, Number(row.avg_score));
  }

  return currentRows.map((row) => {
    const current = Number(row.avg_score);
    const prev = prevMap.get(row.industry as string);
    let trend: "up" | "down" | "stable" = "stable";
    if (prev !== undefined) {
      const diff = current - prev;
      if (diff > 3) trend = "up";
      else if (diff < -3) trend = "down";
    }
    return {
      industry: row.industry as string,
      avg_score: Math.round(current),
      trend,
    };
  });
}

async function groupThemesWithClaude(
  items: { word: string; count: number; growth_pct: number; headlines: string[]; industries: string[] }[]
): Promise<TrendItem[]> {
  if (items.length === 0) return [];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Group these trending ad terms into themes. Each theme should combine related words into a single label.

Terms:
${items.map((i) => `- "${i.word}" (count: ${i.count}, growth: ${i.growth_pct > 0 ? "+" : ""}${i.growth_pct}%, industries: ${i.industries.join(", ")}, headlines: ${JSON.stringify(i.headlines)})`).join("\n")}

Return a JSON array where each element is:
{
  "term": "<theme label, e.g. 'AI & Automation', 'Sustainability'>",
  "count": <sum of counts for grouped words>,
  "growth_pct": <average growth_pct of grouped words, rounded>,
  "industries": [<merged unique industries>],
  "example_headlines": [<up to 3 best headlines from grouped words>]
}

Group aggressively — combine related words. If a term doesn't fit any group, keep it standalone. Return 5-10 themes max. Return ONLY the JSON array.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return items.map((i) => ({
      term: i.word,
      count: i.count,
      growth_pct: i.growth_pct,
      industries: i.industries,
      example_headlines: i.headlines,
    }));
  }
}

function periodLabel(days: number): string {
  if (days <= 7) return "Last 7 days";
  if (days <= 30) return "Last 30 days";
  return `Last ${days} days`;
}

export async function detectTrends(options?: {
  industry?: string;
  days?: number;
}): Promise<TrendReport> {
  const days = options?.days ?? 30;
  const industry = options?.industry;

  const [currentFreqs, previousFreqs, industryShifts] = await Promise.all([
    getWordFrequencies(days, 0, industry),
    getWordFrequencies(days, days, industry),
    getIndustryShifts(days, industry),
  ]);

  // Compute growth for each word
  const rising: { word: string; count: number; growth_pct: number; headlines: string[]; industries: string[] }[] = [];
  const declining: { word: string; count: number; growth_pct: number; headlines: string[]; industries: string[] }[] = [];

  for (const [word, data] of currentFreqs) {
    const prev = previousFreqs.get(word)?.count ?? 0;
    if (prev === 0 && data.count >= 2) {
      rising.push({ word, count: data.count, growth_pct: 100, headlines: data.headlines, industries: data.industries });
    } else if (prev > 0) {
      const growth = Math.round(((data.count - prev) / prev) * 100);
      if (growth > 20) {
        rising.push({ word, count: data.count, growth_pct: growth, headlines: data.headlines, industries: data.industries });
      } else if (growth < -20) {
        declining.push({ word, count: data.count, growth_pct: growth, headlines: data.headlines, industries: data.industries });
      }
    }
  }

  // Words that disappeared
  for (const [word, data] of previousFreqs) {
    if (!currentFreqs.has(word) && data.count >= 2) {
      declining.push({ word, count: 0, growth_pct: -100, headlines: data.headlines, industries: data.industries });
    }
  }

  rising.sort((a, b) => b.growth_pct - a.growth_pct);
  declining.sort((a, b) => a.growth_pct - b.growth_pct);

  const topRising = rising.slice(0, 20);
  const topDeclining = declining.slice(0, 20);

  // Use Claude to group terms into themes
  const [risingThemes, decliningThemes] = await Promise.all([
    groupThemesWithClaude(topRising),
    groupThemesWithClaude(topDeclining),
  ]);

  // Top words overall (from current period)
  const topWords: { word: string; count: number }[] = [];
  for (const [word, data] of currentFreqs) {
    topWords.push({ word, count: data.count });
  }
  topWords.sort((a, b) => b.count - a.count);

  return {
    period: periodLabel(days),
    rising_themes: risingThemes,
    declining_themes: decliningThemes,
    top_words: topWords.slice(0, 20),
    industry_shifts: industryShifts,
  };
}
