import Anthropic from "@anthropic-ai/sdk";
import { parseClaudeJSON } from "./parse-json";
import { PDFParse } from "pdf-parse";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ExtractedCampaign {
  headline: string;
  body_copy?: string;
  script?: string;
  industry: string;
  media_type: string;
  language: string;
  visual_description?: string;
  confidence: number;
  page_number?: number;
}

export interface FileExtractionResult {
  campaigns: ExtractedCampaign[];
  raw_text?: string;
  total_pages?: number;
  file_type: string;
}

const EXTRACTION_PROMPT = `You are analyzing an advertising document (pitch deck, campaign brief, print ad, or creative asset). Extract ALL distinct ad campaign concepts you can identify.

For each campaign concept found, extract:
- headline: The main headline or tagline of the campaign
- body_copy: Any body copy or description text (if present)
- script: Any video/radio script content (if present)
- industry: The industry category (one of: automotive, tech, fmcg, finance, healthcare, retail, food, fashion, travel, entertainment, other)
- media_type: The media format (one of: digital, print, video, radio, social, outdoor)
- language: ISO language code (e.g. "en", "es", "fr")
- visual_description: Describe the creative approach, visual metaphor, art direction, color palette, imagery style (if visual content is present)
- confidence: 0-100 how confident you are in this extraction (high if clearly labeled as a headline/campaign, lower if inferred from context)
- page_number: Which page or slide this came from (if determinable)

A single document may contain multiple distinct campaign concepts (e.g., a pitch deck with 3-5 different campaign ideas). Extract each one separately.

If you see text that is clearly a headline or tagline, give it high confidence (80-100).
If you're inferring a campaign concept from context or visuals, give it moderate confidence (50-79).
If it's ambiguous whether something is a campaign concept, give it low confidence (20-49).

Return ONLY valid JSON in this exact format:
{
  "campaigns": [
    {
      "headline": "...",
      "body_copy": "...",
      "script": "...",
      "industry": "...",
      "media_type": "...",
      "language": "...",
      "visual_description": "...",
      "confidence": 85,
      "page_number": 1
    }
  ]
}

If no campaign concepts can be identified, return {"campaigns": []}.`;

function getMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  if (mimeType === "image/gif") return "image/gif";
  return "image/jpeg";
}

async function extractFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<FileExtractionResult> {
  const base64 = buffer.toString("base64");
  const mediaType = getMediaType(mimeType);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const parsed = parseClaudeJSON(text);

  return {
    campaigns: parsed.campaigns || [],
    file_type: mimeType,
    total_pages: 1,
  };
}

async function extractFromPDF(buffer: Buffer): Promise<FileExtractionResult> {
  // Extract text with pdf-parse
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const rawText = textResult.text;
  const totalPages = textResult.total;
  await parser.destroy();

  // Send the full PDF as a document to Claude for visual + text analysis
  const base64 = buffer.toString("base64");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `This PDF has ${totalPages} page(s). Here is the extracted text for additional context:\n\n${rawText.slice(0, 5000)}\n\n${EXTRACTION_PROMPT}`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const parsed = parseClaudeJSON(text);

  return {
    campaigns: parsed.campaigns || [],
    raw_text: rawText,
    total_pages: totalPages,
    file_type: "application/pdf",
  };
}

export async function extractCampaignsFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<FileExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractFromPDF(buffer);
  }

  if (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  ) {
    return extractFromImage(buffer, mimeType);
  }

  // For PPTX and other files, convert to base64 and send as document
  // Claude can process these as documents
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-powerpoint"
  ) {
    const base64 = buffer.toString("base64");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const parsed = parseClaudeJSON(text);

    return {
      campaigns: parsed.campaigns || [],
      file_type: mimeType,
    };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
