const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

export const DEFAULT_JUDGE_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam — deep, authoritative

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  return apiKey;
}

/**
 * Synthesize a verdict script to audio using ElevenLabs TTS stream endpoint.
 * Returns a ReadableStream of mp3 audio data.
 */
export async function synthesizeVerdict(
  script: string,
  voiceId?: string
): Promise<ReadableStream> {
  const apiKey = getApiKey();
  const voice = voiceId || DEFAULT_JUDGE_VOICE_ID;

  const res = await fetch(
    `${ELEVENLABS_API_BASE}/v1/text-to-speech/${voice}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_turbo_v2_5",
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error: ${res.status} ${err}`);
  }

  if (!res.body) {
    throw new Error("ElevenLabs TTS returned no body");
  }

  return res.body;
}

/**
 * Transcribe audio to text using ElevenLabs STT endpoint.
 * Accepts a FormData object with an "audio" file field.
 */
export async function transcribeAudio(formData: FormData): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(`${ELEVENLABS_API_BASE}/v1/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs STT error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.text as string;
}

// ---- Verdict script types ----

interface EvidenceItem {
  ad_headline?: string;
  ad_brand?: string;
  agency?: string;
  year?: number;
  similarity_pct?: number;
  overlap?: string;
}

interface DimensionScore {
  score: number;
  explanation?: string;
  evidence?: EvidenceItem[];
}

export interface AnalysisResult {
  overall_score: number;
  verdict: string;
  summary?: string;
  dimensions: {
    concept: DimensionScore;
    language: DimensionScore;
    strategy: DimensionScore;
    execution?: DimensionScore;
    [key: string]: DimensionScore | undefined;
  };
  similar_ads?: Array<{
    headline?: string;
    brand?: string;
    year?: number;
    similarity_score?: number;
  }>;
}

/**
 * Build a word-of-mouth reaction script — what real people would say to each other
 * after seeing this ad. Tone and content are driven by the originality score.
 * Targets 60–90 words (~15–22 seconds at natural conversational pace).
 */
export function buildVerdictScript(result: AnalysisResult): string {
  const { overall_score } = result;
  const lines = getReactionLines(overall_score);
  return lines.join(" ");
}

export function getReactionLines(score: number): [string, string, string] {
  if (score >= 85) return [
    "Wow, that was really original — I hadn't thought about it that way.",
    "I'm actually sending this to someone.",
    "You don't see work like that very often.",
  ];
  if (score >= 70) return [
    "Yeah, I liked it — felt fresh.",
    "I'd probably remember that one.",
    "It's got something.",
  ];
  if (score >= 55) return [
    "It's fine, but I feel like I've seen it before.",
    "Didn't really stop me scrolling.",
    "Close, but not quite there.",
  ];
  if (score >= 40) return [
    "Every brand does this.",
    "I tuned out pretty fast.",
    "It just kind of washed over me.",
  ];
  return [
    "Oh no, not this again.",
    "I've seen this exact ad a hundred times.",
    "Nobody's going to talk about this.",
  ];
}
