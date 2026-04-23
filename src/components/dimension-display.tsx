"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ExternalLink, FileSearch } from "lucide-react";

export interface EvidenceItem {
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

export interface DimensionScore {
  score: number;
  explanation: string;
  ads_searched: number;
  evidence: EvidenceItem[];
}

function scoreColor(score: number) {
  return score >= 80 ? "#22c55e"
       : score >= 60 ? "#10b981"
       : score >= 40 ? "#eab308"
       :               "#ef4444";
}

export function DimensionRadial({
  score,
  label,
  icon,
  weight,
  delay,
}: {
  score: number;
  label: string;
  icon: React.ReactNode;
  weight: string;
  delay: number;
}) {
  const size = 96;
  const strokeWidth = 6;
  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const color = scoreColor(score);

  useEffect(() => {
    const timer = setTimeout(
      () => setOffset(circumference - (score / 100) * circumference),
      300 + delay
    );
    return () => clearTimeout(timer);
  }, [score, circumference, delay]);

  return (
    <div
      className="radial-tile flex flex-col items-center gap-2 animate-tile-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            fill="none"
            opacity="0.4"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="score-display text-2xl font-bold font-mono"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[var(--foreground)]">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="text-xs font-semibold tracking-wide">{label}</span>
      </div>
      <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-70 tracking-widest">
        WEIGHT {weight}
      </span>
    </div>
  );
}

export function EvidenceDossier({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] italic pl-5 py-2">
        <FileSearch className="w-4 h-4 opacity-60" />
        <span>No significant prior art found.</span>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {evidence.map((e, i) => {
        const severity =
          e.similarity_pct >= 70 ? "dossier-danger"
          : e.similarity_pct >= 40 ? "dossier-warning"
          : "";
        return (
          <div key={i} className={`dossier ${severity} space-y-2.5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="font-semibold text-sm leading-snug"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  &ldquo;{e.ad_headline}&rdquo;
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  <span className="font-medium text-[var(--foreground)]/80">
                    {e.ad_brand}
                  </span>
                  {e.agency && e.agency !== "unknown" ? (
                    <span className="opacity-70"> / {e.agency}</span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.similarity_pct > 0 && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      e.similarity_pct >= 70
                        ? "bg-red-500/12 text-red-500 border border-red-500/25"
                        : e.similarity_pct >= 40
                        ? "bg-amber-500/12 text-amber-600 border border-amber-500/25"
                        : "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]"
                    }`}
                  >
                    {e.similarity_pct}% MATCH
                  </span>
                )}
                {e.source_url && (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:opacity-70"
                    aria-label="Open source"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                e.industry,
                e.media_type,
                e.year && e.year > 0 ? String(e.year) : null,
                e.country !== "unknown" ? e.country : null,
                e.language !== "unknown" ? e.language?.toUpperCase() : null,
              ]
                .filter(Boolean)
                .map((tag, j) => (
                  <span
                    key={j}
                    className="text-[10px] font-mono tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded border border-[var(--border-subtle)]"
                  >
                    {String(tag).toUpperCase()}
                  </span>
                ))}
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {e.overlap}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function DimensionDetail({
  label,
  icon,
  weight,
  dimension,
}: {
  label: string;
  icon: React.ReactNode;
  weight: string;
  dimension: DimensionScore;
}) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(dimension.score);

  return (
    <div
      className="card-primary rounded-xl overflow-hidden transition-all"
      style={{
        borderLeft: `3px solid ${open ? color : "transparent"}`,
        transition: "border-color 0.3s",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-[var(--surface-2)] transition-colors"
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{
            background: `${color}15`,
            color,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-semibold text-sm tracking-tight"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {label}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
              WEIGHT {weight}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
            {open ? "Tap to collapse" : "Tap to view evidence dossier"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-xl font-mono font-bold score-display"
            style={{ color }}
          >
            {dimension.score}
          </span>
          {dimension.ads_searched > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">
              {dimension.ads_searched} compared
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 space-y-4 border-t border-[var(--border)] bg-[var(--surface-2)]/40">
          <div>
            <p className="section-eyebrow mb-2">Analysis</p>
            <p className="text-sm text-[var(--foreground)]/85 leading-relaxed">
              {dimension.explanation}
            </p>
          </div>
          <div>
            <p className="section-eyebrow mb-3">
              Evidence dossier
              {dimension.evidence.length > 0 && (
                <span className="readout ml-2">
                  <span className="readout-dot" />
                  {dimension.evidence.length} {dimension.evidence.length === 1 ? "match" : "matches"}
                </span>
              )}
            </p>
            <EvidenceDossier evidence={dimension.evidence} />
          </div>
        </div>
      )}
    </div>
  );
}
