export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { checkClaims, extractClaimsFromImage } from "@/lib/claims";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  let claims_text = "";
  let claimant = "";
  let context = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    claims_text = (formData.get("claims_text") as string) || "";
    claimant = (formData.get("claimant") as string) || "";
    context = (formData.get("context") as string) || "";

    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const mimeType = imageFile.type as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp";

      const extractedText = await extractClaimsFromImage(base64Data, mimeType);

      if (claims_text) {
        claims_text = `${claims_text}\n\n[Extracted from uploaded image]:\n${extractedText}`;
      } else {
        claims_text = extractedText;
      }
    }
  } else {
    const body = await req.json();
    claims_text = body.claims_text || "";
    claimant = body.claimant || "";
    context = body.context || "";
  }

  if (!claims_text) {
    return NextResponse.json(
      { error: "claims_text or an image is required" },
      { status: 400 }
    );
  }

  const report = await checkClaims({ claims_text, claimant, context });
  return NextResponse.json(report);
}
