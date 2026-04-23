export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { buildVerdictScript, synthesizeVerdict } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  if (!body || typeof body !== "object" || !("overall_score" in body)) {
    return NextResponse.json({ error: "Missing analysis result in body" }, { status: 422 });
  }

  try {
    const script = buildVerdictScript(body as Parameters<typeof buildVerdictScript>[0]);
    const audioStream = await synthesizeVerdict(script);

    return new NextResponse(audioStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("ElevenLabs TTS error:", err);
    return NextResponse.json({ error: "Voice synthesis failed" }, { status: 502 });
  }
}
