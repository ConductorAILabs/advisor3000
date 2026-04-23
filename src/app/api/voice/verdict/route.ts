export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildVerdictScript, synthesizeVerdict } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  // Audio reactions are gated behind signup — only authenticated users can
  // synthesize the TTS verdict. Text reactions remain available to everyone
  // via the client component (no API call needed).
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Sign up to hear reactions" },
      { status: 401 },
    );
  }

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
