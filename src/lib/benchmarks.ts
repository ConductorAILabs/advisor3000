import { sql } from "@/lib/neon";

export interface IndustryBenchmark {
  industry: string;
  media_type: string;
  avg_score: number;
  median_score: number;
  total_scored: number;
  percentile_rank: number;
  top_10_threshold: number;
  distribution: { bucket: string; count: number }[];
}

export async function getIndustryBenchmark(
  industry: string,
  media_type: string,
  score: number
): Promise<IndustryBenchmark> {
  // Get all scores for same industry (broad) and same industry+media_type (narrow)
  const [industryScores, comboScores, distributionRows] = await Promise.all([
    sql`
      SELECT v.score
      FROM verdicts v
      JOIN campaigns c ON c.id = v.campaign_id
      WHERE LOWER(c.industry) = LOWER(${industry})
      ORDER BY v.score
    `,
    sql`
      SELECT v.score
      FROM verdicts v
      JOIN campaigns c ON c.id = v.campaign_id
      WHERE LOWER(c.industry) = LOWER(${industry})
        AND LOWER(c.media_type) = LOWER(${media_type})
      ORDER BY v.score
    `,
    sql`
      SELECT
        CASE
          WHEN v.score >= 0 AND v.score < 20 THEN '0-20'
          WHEN v.score >= 20 AND v.score < 40 THEN '20-40'
          WHEN v.score >= 40 AND v.score < 60 THEN '40-60'
          WHEN v.score >= 60 AND v.score < 80 THEN '60-80'
          WHEN v.score >= 80 AND v.score <= 100 THEN '80-100'
        END AS bucket,
        COUNT(*)::int AS count
      FROM verdicts v
      JOIN campaigns c ON c.id = v.campaign_id
      WHERE LOWER(c.industry) = LOWER(${industry})
      GROUP BY bucket
      ORDER BY bucket
    `,
  ]);

  // Use combo scores if we have enough, otherwise fall back to industry-wide
  const scores = (comboScores.length >= 3 ? comboScores : industryScores).map(
    (r) => Number(r.score)
  );
  const totalScored = scores.length;

  // Calculate stats
  let avgScore = 0;
  let medianScore = 0;
  let percentileRank = 50;
  let top10Threshold = 90;

  if (totalScored > 0) {
    avgScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / totalScored
    );

    // Median
    const mid = Math.floor(totalScored / 2);
    medianScore =
      totalScored % 2 === 0
        ? Math.round((scores[mid - 1] + scores[mid]) / 2)
        : scores[mid];

    // Percentile rank: percentage of scores this score is >= to
    const belowCount = scores.filter((s) => s < score).length;
    percentileRank = Math.round((belowCount / totalScored) * 100);

    // Top 10% threshold
    const p90Index = Math.ceil(totalScored * 0.9) - 1;
    top10Threshold = scores[Math.min(p90Index, totalScored - 1)];
  }

  // Build distribution with all buckets
  const bucketLabels = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const distributionMap = new Map<string, number>();
  for (const label of bucketLabels) {
    distributionMap.set(label, 0);
  }
  for (const row of distributionRows) {
    if (row.bucket) {
      distributionMap.set(row.bucket as string, Number(row.count));
    }
  }
  const distribution = bucketLabels.map((bucket) => ({
    bucket,
    count: distributionMap.get(bucket) || 0,
  }));

  return {
    industry,
    media_type,
    avg_score: avgScore,
    median_score: medianScore,
    total_scored: totalScored,
    percentile_rank: percentileRank,
    top_10_threshold: top10Threshold,
    distribution,
  };
}
