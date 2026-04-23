const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-multilingual-2";

let lastCallTime = 0;
const MIN_INTERVAL_MS = 21000; // ~3 RPM safe margin for free tier

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS && lastCallTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTime = Date.now();
}

async function voyageFetch(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
  await rateLimit();
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (res.status === 429) {
    // Back off and retry once
    await new Promise((resolve) => setTimeout(resolve, 25000));
    lastCallTime = Date.now();
    const retry = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: texts, input_type: inputType }),
    });
    if (!retry.ok) {
      const err = await retry.text();
      throw new Error(`Voyage API error after retry: ${retry.status} ${err}`);
    }
    const data = await retry.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function embed(texts: string[]): Promise<number[][]> {
  return voyageFetch(texts, "document");
}

export async function embedQuery(text: string): Promise<number[]> {
  const result = await voyageFetch([text], "query");
  return result[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Batch multiple texts in a single API call (Voyage supports up to 128 texts)
  return voyageFetch(texts, "query");
}
