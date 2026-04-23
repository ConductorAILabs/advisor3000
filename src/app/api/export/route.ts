import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireUser } from "@/lib/session";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Types (mirrors AdjudgeVerdict stored in verdicts.similar_ads JSONB)
// ---------------------------------------------------------------------------

interface EvidenceItem {
  ad_headline: string;
  ad_brand: string;
  agency?: string;
  industry: string;
  media_type: string;
  year?: number;
  country?: string;
  language?: string;
  similarity_pct: number;
  overlap: string;
  source_url?: string;
}

interface DimensionScore {
  score: number;
  explanation: string;
  ads_searched: number;
  evidence: EvidenceItem[];
}

interface Predictability {
  is_predictable: boolean;
  closest_match_index: number | null;
  closest_match_headline: string | null;
  similarity_explanation: string;
  predictability_tier: string;
  penalty: number;
}

interface AdjudgeVerdict {
  overall_score: number;
  pre_penalty_score?: number;
  verdict: string;
  summary: string;
  total_ads_compared?: number;
  search_sources?: string[];
  dimensions: {
    concept: DimensionScore;
    language: DimensionScore;
    strategy: DimensionScore;
    execution: DimensionScore;
  };
  predictability?: Predictability;
  methodology: string;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const AMBER = "#f59e0b";
const DARK = "#1a1a1a";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
  },
  // Header
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: AMBER,
  },
  brand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 2,
  },
  headerDate: { fontSize: 9, color: GRAY },

  // Campaign meta
  metaRow: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 2,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GRAY,
    width: 90,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 10, color: DARK, flex: 1 },

  // Score hero
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AMBER,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  verdictLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  summaryText: { fontSize: 10, color: DARK, lineHeight: 1.5 },

  // Section headers
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: AMBER,
  },

  // Dimension block
  dimBlock: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 3,
  },
  dimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dimName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
  },
  dimScore: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: AMBER,
  },
  dimExplanation: {
    fontSize: 9,
    color: DARK,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  adsSearched: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 4,
  },

  // Evidence table
  evidenceRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  evidenceHeader: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: DARK,
  },
  evidenceCell: { fontSize: 7.5, color: DARK },
  evidenceHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
  },
  colHeadline: { width: "20%" },
  colBrand: { width: "10%" },
  colAgency: { width: "10%" },
  colIndustry: { width: "10%" },
  colMedia: { width: "8%" },
  colYear: { width: "5%" },
  colCountry: { width: "7%" },
  colLang: { width: "5%" },
  colSim: { width: "6%" },
  colOverlap: { width: "19%" },

  // Predictability
  predBlock: {
    marginTop: 6,
    padding: 10,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 3,
  },
  predRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  predLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GRAY,
    width: 130,
  },
  predValue: { fontSize: 9, color: DARK, flex: 1 },

  // Methodology footer
  methodology: {
    marginTop: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: GRAY,
    textAlign: "center",
  },
});

// ---------------------------------------------------------------------------
// PDF Components
// ---------------------------------------------------------------------------

function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence || evidence.length === 0) {
    return React.createElement(
      Text,
      { style: { fontSize: 8, color: GRAY, fontStyle: "italic" } },
      "No matching evidence found for this dimension."
    );
  }

  const headerCells = [
    { label: "Headline", style: s.colHeadline },
    { label: "Brand", style: s.colBrand },
    { label: "Agency", style: s.colAgency },
    { label: "Industry", style: s.colIndustry },
    { label: "Media", style: s.colMedia },
    { label: "Year", style: s.colYear },
    { label: "Country", style: s.colCountry },
    { label: "Lang", style: s.colLang },
    { label: "Sim%", style: s.colSim },
    { label: "Overlap", style: s.colOverlap },
  ];

  return React.createElement(
    View,
    null,
    React.createElement(
      View,
      { style: s.evidenceHeader },
      ...headerCells.map((h) =>
        React.createElement(
          Text,
          { key: h.label, style: [s.evidenceHeaderCell, h.style] },
          h.label
        )
      )
    ),
    ...evidence.map((ev, i) =>
      React.createElement(
        View,
        { key: i, style: s.evidenceRow },
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colHeadline] },
          truncate(ev.ad_headline, 40)
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colBrand] },
          truncate(ev.ad_brand, 18)
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colAgency] },
          truncate(ev.agency || "—", 18)
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colIndustry] },
          truncate(ev.industry, 16)
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colMedia] },
          truncate(ev.media_type, 12)
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colYear] },
          ev.year && ev.year > 0 ? String(ev.year) : "—"
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colCountry] },
          ev.country || "—"
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colLang] },
          ev.language || "—"
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colSim] },
          `${ev.similarity_pct}%`
        ),
        React.createElement(
          Text,
          { style: [s.evidenceCell, s.colOverlap] },
          truncate(ev.overlap, 50)
        )
      )
    )
  );
}

function DimensionBlock({
  name,
  dim,
  weight,
}: {
  name: string;
  dim: DimensionScore;
  weight: string;
}) {
  return React.createElement(
    View,
    { style: s.dimBlock },
    React.createElement(
      View,
      { style: s.dimHeader },
      React.createElement(
        Text,
        { style: s.dimName },
        `${name} (${weight})`
      ),
      React.createElement(
        Text,
        { style: s.dimScore },
        `${dim.score} / 100`
      )
    ),
    React.createElement(Text, { style: s.dimExplanation }, dim.explanation),
    React.createElement(
      Text,
      { style: s.adsSearched },
      `Ads searched: ${dim.ads_searched}`
    ),
    React.createElement(EvidenceTable, { evidence: dim.evidence })
  );
}

function AdjudgePDF({
  verdict,
  campaign,
  analysisDate,
}: {
  verdict: AdjudgeVerdict;
  campaign: { headline: string; industry: string; media_type: string };
  analysisDate: string;
}) {
  const dims: {
    name: string;
    key: keyof AdjudgeVerdict["dimensions"];
    weight: string;
  }[] = [
    { name: "Concept", key: "concept", weight: "40%" },
    { name: "Language", key: "language", weight: "25%" },
    { name: "Strategy", key: "strategy", weight: "20%" },
    { name: "Execution", key: "execution", weight: "15%" },
  ];

  const pred = verdict.predictability;

  return React.createElement(
    Document,
    null,
    // Page 1: Score + Summary + Dimensions
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      // Header
      React.createElement(
        View,
        { style: s.headerBar },
        React.createElement(Text, { style: s.brand }, "ADJUDGE"),
        React.createElement(
          Text,
          { style: s.headerDate },
          `Originality Report  |  ${analysisDate}`
        )
      ),
      // Campaign meta
      React.createElement(
        View,
        { style: s.metaRow },
        React.createElement(Text, { style: s.metaLabel }, "Headline"),
        React.createElement(
          Text,
          { style: s.metaValue },
          campaign.headline
        )
      ),
      React.createElement(
        View,
        { style: s.metaRow },
        React.createElement(Text, { style: s.metaLabel }, "Industry"),
        React.createElement(
          Text,
          { style: s.metaValue },
          campaign.industry
        )
      ),
      React.createElement(
        View,
        { style: s.metaRow },
        React.createElement(Text, { style: s.metaLabel }, "Media Type"),
        React.createElement(
          Text,
          { style: s.metaValue },
          campaign.media_type
        )
      ),
      // Overall score
      React.createElement(
        View,
        { style: s.scoreSection },
        React.createElement(
          View,
          { style: s.scoreCircle },
          React.createElement(
            Text,
            { style: s.scoreNumber },
            String(verdict.overall_score)
          )
        ),
        React.createElement(
          View,
          { style: { flex: 1 } },
          React.createElement(
            Text,
            { style: s.verdictLabel },
            verdict.verdict
          ),
          React.createElement(
            Text,
            { style: s.summaryText },
            verdict.summary
          )
        )
      ),
      // Dimension scores
      React.createElement(
        Text,
        { style: s.sectionTitle },
        "Dimension Scores"
      ),
      ...dims.map((d) =>
        React.createElement(DimensionBlock, {
          key: d.key,
          name: d.name,
          dim: verdict.dimensions[d.key],
          weight: d.weight,
        })
      )
    ),
    // Page 2: Predictability + Methodology
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      // Header repeat
      React.createElement(
        View,
        { style: s.headerBar },
        React.createElement(Text, { style: s.brand }, "ADJUDGE"),
        React.createElement(
          Text,
          { style: s.headerDate },
          "Originality Report (continued)"
        )
      ),
      // Predictability
      pred
        ? React.createElement(
            View,
            null,
            React.createElement(
              Text,
              { style: s.sectionTitle },
              "AI Predictability Analysis"
            ),
            React.createElement(
              View,
              { style: s.predBlock },
              React.createElement(
                View,
                { style: s.predRow },
                React.createElement(
                  Text,
                  { style: s.predLabel },
                  "AI-Predictable?"
                ),
                React.createElement(
                  Text,
                  { style: s.predValue },
                  pred.is_predictable ? "Yes" : "No"
                )
              ),
              React.createElement(
                View,
                { style: s.predRow },
                React.createElement(
                  Text,
                  { style: s.predLabel },
                  "Predictability Tier"
                ),
                React.createElement(
                  Text,
                  { style: s.predValue },
                  pred.predictability_tier || "None"
                )
              ),
              React.createElement(
                View,
                { style: s.predRow },
                React.createElement(
                  Text,
                  { style: s.predLabel },
                  "Score Penalty"
                ),
                React.createElement(
                  Text,
                  { style: s.predValue },
                  `${pred.penalty} points`
                )
              ),
              pred.closest_match_headline
                ? React.createElement(
                    View,
                    { style: s.predRow },
                    React.createElement(
                      Text,
                      { style: s.predLabel },
                      "Closest AI-Generated Match"
                    ),
                    React.createElement(
                      Text,
                      { style: s.predValue },
                      `"${pred.closest_match_headline}"`
                    )
                  )
                : null,
              React.createElement(
                View,
                { style: { ...s.predRow, marginTop: 4 } },
                React.createElement(
                  Text,
                  { style: s.predLabel },
                  "Explanation"
                ),
                React.createElement(
                  Text,
                  { style: s.predValue },
                  pred.similarity_explanation
                )
              ),
              verdict.pre_penalty_score != null
                ? React.createElement(
                    View,
                    { style: s.predRow },
                    React.createElement(
                      Text,
                      { style: s.predLabel },
                      "Pre-Penalty Score"
                    ),
                    React.createElement(
                      Text,
                      { style: s.predValue },
                      String(verdict.pre_penalty_score)
                    )
                  )
                : null
            )
          )
        : null,
      // Methodology
      React.createElement(
        Text,
        { style: s.sectionTitle },
        "Methodology"
      ),
      React.createElement(
        Text,
        { style: s.methodology },
        verdict.methodology
      ),
      React.createElement(
        Text,
        { style: { ...s.methodology, marginTop: 8 } },
        "Disclaimer: Results reflect the discoverable public record of advertising and are not a guarantee of absolute originality. " +
          "This report is generated by the Adjudge platform using AI-driven analysis and should be used as one input among many in creative decision-making."
      ),
      verdict.total_ads_compared
        ? React.createElement(
            Text,
            { style: { ...s.methodology, marginTop: 4 } },
            `Total unique ads compared: ${verdict.total_ads_compared}`
          )
        : null,
      verdict.search_sources && verdict.search_sources.length > 0
        ? React.createElement(
            Text,
            { style: { ...s.methodology, marginTop: 2 } },
            `Search sources: ${verdict.search_sources.join(", ")}`
          )
        : null,
      // Footer
      React.createElement(
        Text,
        { style: s.footer },
        `Generated by Adjudge  |  ${analysisDate}  |  adjudge.ai`
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str: string, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
}

// ---------------------------------------------------------------------------
// GET /api/export?verdict_id=123
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const verdictId = req.nextUrl.searchParams.get("verdict_id");

  if (!verdictId) {
    return NextResponse.json(
      { error: "verdict_id query parameter is required" },
      { status: 400 }
    );
  }

  // Fetch verdict + campaign in one query, scoped to user's client
  const rows = await sql`
    SELECT
      v.id,
      v.score,
      v.verdict,
      v.reasoning,
      v.similar_ads,
      v.created_at,
      c.headline,
      c.industry,
      c.media_type,
      c.client_id
    FROM verdicts v
    JOIN campaigns c ON c.id = v.campaign_id
    WHERE v.id = ${verdictId}
    LIMIT 1
  `;
  if (rows[0] && rows[0].client_id !== user.clientId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "verdict not found" },
      { status: 404 }
    );
  }

  const row = rows[0];
  const verdictData = (
    typeof row.similar_ads === "string"
      ? JSON.parse(row.similar_ads)
      : row.similar_ads
  ) as AdjudgeVerdict;

  const campaign = {
    headline: row.headline as string,
    industry: row.industry as string,
    media_type: row.media_type as string,
  };

  const analysisDate = row.created_at
    ? new Date(row.created_at as string).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  // Render PDF
  const doc = React.createElement(AdjudgePDF, {
    verdict: verdictData,
    campaign,
    analysisDate,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);

  const filename = `adjudge-report-${verdictId}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
