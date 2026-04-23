import FirecrawlApp from "@mendable/firecrawl-js";

let _firecrawl: FirecrawlApp | null = null;

function getFirecrawl() {
  if (!_firecrawl) {
    _firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
  }
  return _firecrawl;
}

export interface CrawledAd {
  headline: string;
  body_copy?: string;
  script?: string;
  brand: string;
  agency?: string;
  industry: string;
  media_type: string;
  language: string;
  year?: number;
  country?: string;
  source_url: string;
  source: string;
}

function extractResults(result: { web?: unknown[] }): { raw_results: string[]; source_urls: string[] } {
  const raw_results: string[] = [];
  const source_urls: string[] = [];
  const items = result.web ?? [];
  for (const item of items) {
    const doc = item as Record<string, unknown>;
    if (doc.markdown) {
      raw_results.push(String(doc.markdown).slice(0, 3000));
    } else if (doc.description) {
      raw_results.push(String(doc.description));
    }
    if (doc.url) {
      source_urls.push(String(doc.url));
    }
  }
  return { raw_results, source_urls };
}

export async function searchAds(
  query: string,
  options?: { industry?: string; language?: string }
): Promise<{ raw_results: string[]; source_urls: string[] }> {
  const fc = getFirecrawl();
  const searchQuery = [
    `"${query}" advertisement campaign`,
    options?.industry ? options.industry : "",
    "ad campaign creative headline",
  ].filter(Boolean).join(" ");

  const result = await fc.search(searchQuery, { limit: 10 });
  return extractResults(result);
}

export async function searchWeb(
  query: string,
  limit: number = 10
): Promise<{ raw_results: string[]; source_urls: string[] }> {
  const fc = getFirecrawl();
  const result = await fc.search(query, { limit });
  return extractResults(result);
}

export async function multiSearchAds(
  queries: string[],
  limit: number = 5
): Promise<{ raw_results: string[]; source_urls: string[] }> {
  const allRaw: string[] = [];
  const allUrls: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const { raw_results, source_urls } = await searchWeb(query, limit);
      for (let i = 0; i < source_urls.length; i++) {
        if (!seen.has(source_urls[i])) {
          seen.add(source_urls[i]);
          allRaw.push(raw_results[i] || "");
          allUrls.push(source_urls[i]);
        }
      }
    } catch {
      // individual search may fail, continue
    }
  }

  return { raw_results: allRaw, source_urls: allUrls };
}

export async function scrapeUrl(url: string): Promise<string> {
  const fc = getFirecrawl();
  try {
    const result = await fc.scrape(url, { formats: ["markdown"] });
    const doc = result as Record<string, unknown>;
    return doc.markdown ? String(doc.markdown).slice(0, 5000) : "";
  } catch {
    return "";
  }
}

export async function scrapeTopResults(
  urls: string[],
  maxUrls: number = 3
): Promise<{ contents: string[]; urls: string[] }> {
  const contents: string[] = [];
  const validUrls: string[] = [];

  for (const url of urls.slice(0, maxUrls)) {
    const content = await scrapeUrl(url);
    if (content) {
      contents.push(content);
      validUrls.push(url);
    }
  }

  return { contents, urls: validUrls };
}
