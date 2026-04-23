"use client";

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

export function BenchmarkCard({ benchmark, score }: { benchmark: IndustryBenchmark; score: number }) {
  const maxCount = Math.max(...benchmark.distribution.map((d) => d.count), 1);
  const bucketLabels = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const scoreBucketIndex = Math.min(Math.floor(score / 20), 4);
  const percentileColor = benchmark.percentile_rank >= 75 ? "#4ade80" : benchmark.percentile_rank >= 50 ? "#34d399" : benchmark.percentile_rank >= 25 ? "#eab308" : "#ef4444";

  return (
    <div className="card-elevated rounded-xl p-6 space-y-5 animate-fade-up opacity-0" style={{ animationDelay: "900ms", animationFillMode: "forwards" }}>
      <div className="space-y-1">
        <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Industry Benchmark</h3>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Your <span className="text-[var(--foreground)] font-medium">{benchmark.industry}</span>{" "}
          <span className="text-[var(--foreground)] font-medium">{benchmark.media_type}</span> ad scored in the{" "}
          <span className="font-bold font-mono" style={{ color: percentileColor }}>{benchmark.percentile_rank}th</span> percentile
          of all {benchmark.industry} ads we&rsquo;ve analyzed.
        </p>
      </div>

      {/* Score comparison row */}
      <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg bg-[var(--surface)]">
        <div className="text-center flex-1">
          <p className="text-2xl font-bold font-mono" style={{ color: percentileColor }}>{score}</p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Your score</p>
        </div>
        <div className="w-px h-10 bg-[var(--border)]" />
        <div className="text-center flex-1">
          <p className="text-2xl font-bold font-mono text-[var(--text-muted)]">{benchmark.avg_score}</p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Industry avg</p>
        </div>
        <div className="w-px h-10 bg-[var(--border)]" />
        <div className="text-center flex-1">
          <p className="text-2xl font-bold font-mono" style={{ color: percentileColor }}>
            {benchmark.percentile_rank >= 50 ? `Top ${100 - benchmark.percentile_rank}%` : `Bottom ${benchmark.percentile_rank}%`}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Ranking</p>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="space-y-2">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Score distribution across {benchmark.total_scored} {benchmark.industry} ads</p>
        <div className="flex items-end gap-1.5" style={{ height: 64 }}>
          {benchmark.distribution.map((d, i) => {
            const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const isActive = i === scoreBucketIndex;
            return (
              <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative rounded-t" style={{ height: 52 }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all duration-700"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      backgroundColor: isActive ? "var(--accent)" : "var(--border)",
                      opacity: isActive ? 1 : 0.5,
                    }}
                  />
                  {isActive && (
                    <div
                      className="absolute w-2 h-2 rounded-full bg-[var(--accent)] left-1/2 -translate-x-1/2"
                      style={{ bottom: `calc(${Math.max(heightPct, 4)}% + 4px)` }}
                    />
                  )}
                </div>
                <span className={`text-[9px] font-mono ${isActive ? "text-[var(--accent)] font-bold" : "text-[var(--text-muted)] opacity-60"}`}>
                  {bucketLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional context */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
        <span>Median: <span className="font-mono font-medium text-[var(--foreground)]">{benchmark.median_score}</span></span>
        <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
        <span>Top 10% threshold: <span className="font-mono font-medium text-[var(--foreground)]">{benchmark.top_10_threshold}</span></span>
        <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
        <span>{benchmark.total_scored} ads analyzed</span>
      </div>
    </div>
  );
}
