import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  const [adCount] = await sql`SELECT COUNT(*) as count FROM ads`;
  const [campaignCount] = await sql`SELECT COUNT(*) as count FROM campaigns`;
  const [verdictCount] = await sql`SELECT COUNT(*) as count FROM verdicts`;
  const [avgScore] = await sql`SELECT COALESCE(AVG(score), 0) as avg FROM verdicts`;

  const topIndustries = await sql`
    SELECT industry, COUNT(*) as count FROM ads
    WHERE industry IS NOT NULL
    GROUP BY industry ORDER BY count DESC LIMIT 5
  `;

  const recentVerdicts = await sql`
    SELECT c.headline, c.industry, c.media_type, v.score, v.verdict, v.created_at
    FROM verdicts v
    JOIN campaigns c ON c.id = v.campaign_id
    ORDER BY v.created_at DESC LIMIT 5
  `;

  const scoreDistribution = await sql`
    SELECT
      CASE
        WHEN score >= 80 THEN 'highly_original'
        WHEN score >= 60 THEN 'mostly_original'
        WHEN score >= 40 THEN 'somewhat_derivative'
        ELSE 'highly_derivative'
      END as bucket,
      COUNT(*) as count
    FROM verdicts
    GROUP BY bucket
  `;

  return NextResponse.json({
    corpus_size: Number(adCount.count),
    campaigns_analyzed: Number(campaignCount.count),
    verdicts_issued: Number(verdictCount.count),
    avg_originality_score: Math.round(Number(avgScore.avg)),
    top_industries: topIndustries,
    recent_verdicts: recentVerdicts,
    score_distribution: scoreDistribution,
  });
}
