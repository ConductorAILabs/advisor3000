"use client";

import { BarChart3, TrendingUp } from "lucide-react";

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
  const percentileColor =
    benchmark.percentile_rank >= 75 ? "#22c55e" :
    benchmark.percentile_rank >= 50 ? "#10b981" :
    benchmark.percentile_rank >= 25 ? "#eab308" :
                                       "#ef4444";

  return (
    <div
      className="card-elevated rounded-2xl p-7 space-y-6 animate-fade-up opacity-0"
      style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <p className="section-eyebrow">
            <BarChart3 className="w-3 h-3" />
            Industry Benchmark
          </p>
          <p className="text-base text-[var(--foreground)]/90 leading-relaxed max-w-xl">
            Your <span className="font-semibold text-[var(--foreground)]">{benchmark.industry}</span>{" "}
            <span className="font-semibold text-[var(--foreground)]">{benchmark.media_type}</span> ad scored in the{" "}
            <span className="font-bold font-mono text-lg" style={{ color: percentileColor }}>
              {benchmark.percentile_rank}
              <sup className="text-xs">th</sup>
            </span>{" "}
            percentile of all {benchmark.industry} ads we&rsquo;ve analyzed.
          </p>
        </div>
        <span className="readout">
          <span className="readout-dot" />
          {benchmark.total_scored} ads analyzed
        </span>
      </div>

      {/* Score comparison row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 text-center relative overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ background: percentileColor, opacity: 0.7 }}
          />
          <p className="text-3xl font-bold font-mono score-display" style={{ color: percentileColor }}>
            {score}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1 font-semibold">
            Your score
          </p>
        </div>
        <div className="py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 text-center">
          <p className="text-3xl font-bold font-mono score-display text-[var(--text-muted)]">
            {benchmark.avg_score}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1 font-semibold">
            Industry avg
          </p>
        </div>
        <div className="py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <TrendingUp className="w-4 h-4" style={{ color: percentileColor }} />
            <p className="text-2xl font-bold font-mono score-display" style={{ color: percentileColor }}>
              {benchmark.percentile_rank >= 50
                ? `Top ${100 - benchmark.percentile_rank}%`
                : `Bottom ${benchmark.percentile_rank}%`}
            </p>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1 font-semibold">
            Ranking
          </p>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="space-y-3">
        <p className="section-eyebrow">
          Score distribution
        </p>
        <div className="distribution-track">
          <div className="flex items-end gap-2" style={{ height: 84 }}>
            {benchmark.distribution.map((d, i) => {
              const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              const isActive = i === scoreBucketIndex;
              return (
                <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full relative" style={{ height: 64 }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-md transition-all duration-700"
                      style={{
                        height: `${Math.max(heightPct, 6)}%`,
                        background: isActive
                          ? `linear-gradient(to top, var(--accent), var(--accent-light))`
                          : "var(--border)",
                        opacity: isActive ? 1 : 0.55,
                        boxShadow: isActive ? "0 0 16px var(--accent-glow)" : "none",
                      }}
                    />
                    {isActive && (
                      <div
                        className="absolute -top-0.5 w-2.5 h-2.5 rounded-full left-1/2 -translate-x-1/2 animate-pulse-glow"
                        style={{
                          bottom: `calc(${Math.max(heightPct, 6)}% - 4px)`,
                          background: "var(--accent)",
                          boxShadow: "0 0 10px var(--accent)",
                        }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono tracking-wider ${
                      isActive ? "text-[var(--accent)] font-bold" : "text-[var(--text-muted)] opacity-60"
                    }`}
                  >
                    {bucketLabels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional context */}
      <div className="flex items-center gap-5 text-xs text-[var(--text-muted)] pt-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">Median</span>
          <span className="font-mono font-semibold text-[var(--foreground)]">{benchmark.median_score}</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">Top 10%</span>
          <span className="font-mono font-semibold text-[var(--foreground)]">{benchmark.top_10_threshold}+</span>
        </span>
      </div>
    </div>
  );
}
