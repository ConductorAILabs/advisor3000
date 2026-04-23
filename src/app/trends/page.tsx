"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, BarChart3, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendItem {
  term: string;
  count: number;
  growth_pct: number;
  industries: string[];
  example_headlines: string[];
}

interface TrendReport {
  period: string;
  rising_themes: TrendItem[];
  declining_themes: TrendItem[];
  top_words: { word: string; count: number }[];
  industry_shifts: { industry: string; avg_score: number; trend: "up" | "down" | "stable" }[];
}

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function ThemeCard({ item, type }: { item: TrendItem; type: "rising" | "declining" }) {
  const isPositive = item.growth_pct > 0;
  return (
    <div className="card-primary rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-base" style={{ fontFamily: "var(--font-display)" }}>
          {item.term}
        </h3>
        <span
          className="shrink-0 inline-flex items-center gap-1 text-sm font-mono font-bold px-2 py-0.5 rounded-md"
          style={{
            color: isPositive ? "#22c55e" : "#ef4444",
            background: isPositive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          }}
        >
          {type === "rising" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isPositive ? "+" : ""}{item.growth_pct}%
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="font-mono">{item.count} mentions</span>
        {item.industries.length > 0 && (
          <>
            <span className="text-[var(--border)]">|</span>
            <span className="capitalize">{item.industries.slice(0, 3).join(", ")}</span>
          </>
        )}
      </div>
      {item.example_headlines.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {item.example_headlines.slice(0, 2).map((h, i) => (
            <p key={i} className="text-xs text-[var(--text-muted)] truncate italic">
              &ldquo;{h}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function WordBar({ word, count, maxCount }: { word: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 truncate text-right">{word}</span>
      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full gradient-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-[var(--text-muted)] w-12 text-right">{count}</span>
    </div>
  );
}

export default function TrendsPage() {
  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [industry, setIndustry] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.top_industries) {
          setIndustries(data.top_industries.map((i: { industry: string }) => i.industry));
        }
      })
      .catch(() => {});
  }, []);

  const fetchTrends = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (industry) params.set("industry", industry);
    fetch(`/api/trends?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, industry]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[var(--text-muted)] text-sm tracking-[0.2em] uppercase mb-2">
          Intelligence
        </p>
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trend Detection
        </h1>
        <p className="text-[var(--text-muted)] mt-2 text-sm">
          Analyzing the ad corpus for rising and declining themes, phrases, and patterns.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className="px-4 py-2 text-sm transition-colors"
              style={{
                background: days === opt.value ? "var(--accent)" : "var(--surface)",
                color: days === opt.value ? "#fff" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] capitalize"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <option value="">All industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind} className="capitalize">
              {ind}
            </option>
          ))}
        </select>

        {report && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {report.period}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-3 text-[var(--text-muted)]">Detecting trends...</span>
        </div>
      ) : !report ? (
        <div className="text-center py-16">
          <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
            No trend data available
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Add more ads to the corpus to see trends.
          </p>
        </div>
      ) : (
        <>
          {/* Rising Themes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#22c55e]" />
              <h2
                className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]"
              >
                Rising Themes
              </h2>
            </div>
            {report.rising_themes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No rising themes detected in this period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.rising_themes.map((item, i) => (
                  <ThemeCard key={i} item={item} type="rising" />
                ))}
              </div>
            )}
          </section>

          {/* Declining Themes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-[#ef4444]" />
              <h2
                className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]"
              >
                Declining Themes
              </h2>
            </div>
            {report.declining_themes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No declining themes detected in this period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.declining_themes.map((item, i) => (
                  <ThemeCard key={i} item={item} type="declining" />
                ))}
              </div>
            )}
          </section>

          {/* Most Common Words */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h2
                className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]"
              >
                Most Common Words
              </h2>
            </div>
            {report.top_words.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No word data available.</p>
            ) : (
              <div className="card-elevated rounded-xl p-6">
                <div className="space-y-2">
                  {report.top_words.map((w) => (
                    <WordBar
                      key={w.word}
                      word={w.word}
                      count={w.count}
                      maxCount={report.top_words[0]?.count ?? 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Industry Health */}
          <section>
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4">
              Industry Health
            </h2>
            {report.industry_shifts.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No industry score data available for this period.
              </p>
            ) : (
              <div className="card-primary rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Avg Score
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.industry_shifts.map((ind) => (
                      <tr
                        key={ind.industry}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <td className="px-4 py-3.5 text-sm capitalize font-medium">
                          {ind.industry}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-sm">{ind.avg_score}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            {ind.trend === "up" && (
                              <>
                                <ArrowUp className="w-4 h-4" style={{ color: "#22c55e" }} />
                                <span style={{ color: "#22c55e" }}>Up</span>
                              </>
                            )}
                            {ind.trend === "down" && (
                              <>
                                <ArrowDown className="w-4 h-4" style={{ color: "#ef4444" }} />
                                <span style={{ color: "#ef4444" }}>Down</span>
                              </>
                            )}
                            {ind.trend === "stable" && (
                              <>
                                <Minus className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-[var(--text-muted)]">Stable</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
