import { NextRequest, NextResponse } from "next/server";
import {
  analyzeVisualCreative,
  searchVisualSimilarity,
} from "@/lib/visual-analysis";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const imageFile = formData.get("image");
  if (!imageFile || !(imageFile instanceof Blob)) {
    return NextResponse.json(
      { error: "image file is required" },
      { status: 400 }
    );
  }

  const headline = formData.get("headline") as string | null;
  const industry = formData.get("industry") as string | null;
  const media_type = formData.get("media_type") as string | null;

  // Convert to base64
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");

  // Determine media type
  const mimeType = imageFile.type as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." },
      { status: 400 }
    );
  }

  const context: { headline?: string; industry?: string; media_type?: string } =
    {};
  if (headline) context.headline = headline;
  if (industry) context.industry = industry;
  if (media_type) context.media_type = media_type;

  // Run visual analysis
  const analysis = await analyzeVisualCreative(
    base64Image,
    mimeType,
    Object.keys(context).length > 0 ? context : undefined
  );

  // Run visual similarity search
  const similarAds = await searchVisualSimilarity(analysis);

  return NextResponse.json({
    analysis,
    similar_ads: similarAds,
  });
}
