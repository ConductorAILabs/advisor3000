"use client";

import { useEffect, useState } from "react";
import { Download, Database, BarChart3, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Campaign { id: number; headline: string; industry: string; media_type: string; language: string; created_at: string; score: number | null; verdict: string | null; }
interface Stats { corpus_size: number; campaigns_analyzed: number; verdicts_issued: number; avg_originality_score: number; top_industries: { industry: string; count: number }[]; recent_verdicts: { headline: string; industry: string; media_type: string; score: number; verdict: string; created_at: string }[]; score_distribution: { bucket: string; count: number }[]; }

function DonutChart({ distribution, total }: { distribution: { bucket: string; count: number }[]; total: number }) {
  const buckets = [
    { key: "highly_original", label: "Highly Original", color: "#4ade80" },
    { key: "mostly_original", label: "Mostly Original", color: "#34d399" },
    { key: "somewhat_derivative", label: "Somewhat Derivative", color: "#eab308" },
    { key: "highly_derivative", label: "Highly Derivative", color: "#ef4444" },
  ];

  const size = 140;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {buckets.map((b) => {
            const item = distribution.find((d) => d.bucket === b.key);
            const count = item ? Number(item.count) : 0;
            const pct = total > 0 ? count / total : 0;
            const dashLength = pct * circumference;
            const offset = cumulativeOffset;
            cumulativeOffset += dashLength;
            if (pct === 0) return null;
            return (
              <circle key={b.key} cx={size / 2} cy={size / 2} r={radius} stroke={b.color} strokeWidth="18" fill="none"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`} strokeDashoffset={-offset} />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono">{total}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase">verdicts</span>
        </div>
      </div>
      <div className="space-y-2">
        {buckets.map((b) => {
          const item = distribution.find((d) => d.bucket === b.key);
          const count = item ? Number(item.count) : 0;
          return (
            <div key={b.key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
              <span className="text-xs text-[var(--text-muted)]">{b.label}</span>
              <span className="text-xs font-mono font-medium ml-auto">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([dashData, statsData]) => {
      setCampaigns(dashData.campaigns || []);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function scoreColor(score: number | null) {
    if (!score) return "var(--text-muted)";
    if (score >= 80) return "#4ade80";
    if (score >= 60) return "#34d399";
    if (score >= 40) return "#eab308";
    return "#ef4444";
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[var(--text-muted)] text-sm tracking-[0.2em] uppercase mb-2">Overview</p>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Dashboard</h1>
        <Link href="/trends" className="inline-flex items-center gap-1.5 mt-3 text-sm text-[var(--accent)] hover:underline">
          <TrendingUp className="w-4 h-4" /> View Industry Trends
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-primary rounded-xl p-6 space-y-1">
            <Database className="w-5 h-5 text-[var(--accent)] mb-3" />
            <p className="text-4xl font-bold font-mono tracking-tight">{stats.corpus_size.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">ads in corpus</p>
          </div>
          <div className="card-primary rounded-xl p-6 space-y-1">
            <BarChart3 className="w-5 h-5 text-[var(--accent)] mb-3" />
            <p className="text-4xl font-bold font-mono tracking-tight">{stats.campaigns_analyzed}</p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">campaigns analyzed</p>
          </div>
          <div className="card-primary rounded-xl p-6 space-y-1">
            <TrendingUp className="w-5 h-5 text-[var(--accent)] mb-3" />
            <p className="text-4xl font-bold font-mono tracking-tight gradient-accent-text">{stats.avg_originality_score}</p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">avg. originality</p>
          </div>
        </div>
      )}

      {stats && stats.verdicts_issued > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-primary rounded-xl p-6">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4">Score Distribution</h2>
            <DonutChart distribution={stats.score_distribution} total={stats.verdicts_issued} />
          </div>
          {stats.top_industries.length > 0 && (
            <div className="card-primary rounded-xl p-6">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4">Top Industries</h2>
              <div className="space-y-3">
                {stats.top_industries.map((ind) => {
                  const pct = stats.corpus_size > 0 ? (Number(ind.count) / stats.corpus_size) * 100 : 0;
                  return (
                    <div key={ind.industry} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{ind.industry}</span>
                        <span className="font-mono text-[var(--text-muted)]">{Number(ind.count).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full gradient-accent" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>No campaigns yet</p>
          <a href="/upload" className="text-[var(--accent)] hover:underline mt-2 inline-block text-sm">Upload your first ad</a>
        </div>
      ) : (
        <div>
          <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4">Campaign History</h2>
          <div className="card-primary rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Headline", "Industry", "Type", "Score", "Verdict", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3.5 font-medium text-sm max-w-xs truncate" style={{ fontFamily: "var(--font-display)" }}>{c.headline}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-muted)] capitalize">{c.industry}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-muted)] capitalize">{c.media_type}</td>
                    <td className="px-4 py-3.5">
                      {c.score != null ? (
                        <span className="font-mono font-bold text-sm" style={{ color: scoreColor(c.score) }}>{c.score}</span>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-muted)]">{c.verdict ?? "Pending"}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-muted)]">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      {c.score != null && (
                        <a href={`/api/export?verdict_id=${c.id}`} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
