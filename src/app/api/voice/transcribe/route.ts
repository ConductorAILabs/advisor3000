import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/elevenlabs";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 422 });
  }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 422 });
  }

  try {
    // Pass FormData directly — elevenlabs.ts forwards it to the STT endpoint
    const text = await transcribeAudio(formData);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("ElevenLabs STT error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
