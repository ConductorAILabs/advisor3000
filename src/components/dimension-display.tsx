"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

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

export function DimensionRadial({ score, label, icon, weight, delay }: { score: number; label: string; icon: React.ReactNode; weight: string; delay: number }) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#34d399" : score >= 40 ? "#eab308" : "#ef4444";

  useEffect(() => {
    const timer = setTimeout(() => setOffset(circumference - (score / 100) * circumference), 300 + delay);
    return () => clearTimeout(timer);
  }, [score, circumference, delay]);

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth="5" fill="none" opacity="0.3" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="5" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color }}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[var(--text-muted)]">{icon}<span className="text-xs">{label}</span></div>
      <span className="text-[10px] text-[var(--text-muted)] opacity-60">{weight}</span>
    </div>
  );
}

export function EvidenceDossier({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) return <p className="text-sm text-[var(--text-muted)] italic pl-5">No significant prior art found.</p>;
  return (
    <div className="space-y-4">
      {evidence.map((e, i) => {
        const severity = e.similarity_pct >= 70 ? "dossier-danger" : e.similarity_pct >= 40 ? "dossier-warning" : "";
        return (
          <div key={i} className={`dossier ${severity} space-y-2`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm" style={{ fontFamily: "var(--font-display)" }}>&ldquo;{e.ad_headline}&rdquo;</p>
                <p className="text-xs text-[var(--text-muted)]">{e.ad_brand}{e.agency && e.agency !== "unknown" ? ` \u2014 ${e.agency}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.similarity_pct > 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    e.similarity_pct >= 70 ? "bg-red-500/10 text-red-400" : e.similarity_pct >= 40 ? "bg-amber-500/10 text-amber-400" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                  }`}>{e.similarity_pct}%</span>
                )}
                {e.source_url && <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:opacity-70"><ExternalLink className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[e.industry, e.media_type, e.year && e.year > 0 ? String(e.year) : null, e.country !== "unknown" ? e.country : null, e.language !== "unknown" ? e.language?.toUpperCase() : null]
                .filter(Boolean).map((tag, j) => (
                  <span key={j} className="text-[10px] uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">{tag}</span>
                ))}
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{e.overlap}</p>
          </div>
        );
      })}
    </div>
  );
}

export function DimensionDetail({ label, icon, weight, dimension }: { label: string; icon: React.ReactNode; weight: string; dimension: DimensionScore }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-primary rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-[var(--surface-2)] transition-colors">
        <div className="text-[var(--accent)]">{icon}</div>
        <div className="flex-1">
          <span className="font-medium text-sm" style={{ fontFamily: "var(--font-display)" }}>{label}</span>
          <span className="text-xs text-[var(--text-muted)] ml-2">{weight}</span>
        </div>
        {dimension.ads_searched > 0 && <span className="text-[10px] text-[var(--text-muted)]">{dimension.ads_searched} compared</span>}
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] pt-4 leading-relaxed">{dimension.explanation}</p>
          <EvidenceDossier evidence={dimension.evidence} />
        </div>
      )}
    </div>
  );
}
