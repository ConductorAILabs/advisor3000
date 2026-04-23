"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, ArrowUpDown, Trophy } from "lucide-react";

interface RankedHeadline { rank: number; headline: string; originality_estimate: number; strengths: string; risks: string; }
interface CompareResult {
  similarities: { a: number; b: number; headline_a: string; headline_b: string; similarity: number }[];
  analysis: { ranking: RankedHeadline[]; recommendation: string; pairwise_notes: { pair: string; note: string }[]; };
}

function HeatMap({ headlines, similarities }: { headlines: string[]; similarities: CompareResult["similarities"] }) {
  function getSimValue(i: number, j: number): number {
    if (i === j) return 1;
    const match = similarities.find((s) => (s.a === i && s.b === j) || (s.a === j && s.b === i));
    return match ? match.similarity : 0;
  }

  function cellColor(sim: number): string {
    if (sim >= 0.9) return "rgba(239, 68, 68, 0.6)";
    if (sim >= 0.8) return "rgba(239, 68, 68, 0.4)";
    if (sim >= 0.7) return "rgba(234, 179, 8, 0.4)";
    if (sim >= 0.6) return "rgba(234, 179, 8, 0.25)";
    if (sim >= 0.4) return "rgba(74, 222, 128, 0.15)";
    return "rgba(74, 222, 128, 0.05)";
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `80px repeat(${headlines.length}, 1fr)` }}>
        <div />
        {headlines.map((h, i) => (
          <div key={i} className="px-2 py-1 text-[10px] text-[var(--text-muted)] text-center truncate max-w-[100px]" title={h}>#{i + 1}</div>
        ))}
        {headlines.map((h, i) => (
          <>
            <div key={`label-${i}`} className="px-2 py-2 text-[10px] text-[var(--text-muted)] truncate max-w-[80px] flex items-center" title={h}>#{i + 1}</div>
            {headlines.map((_, j) => {
              const sim = getSimValue(i, j);
              return (
                <div key={`${i}-${j}`}
                  className="w-16 h-10 rounded flex items-center justify-center text-xs font-mono transition-all hover:scale-105"
                  style={{ background: i === j ? "var(--surface-2)" : cellColor(sim) }}
                  title={`${headlines[i]} ↔ ${headlines[j]}`}>
                  {i === j ? "—" : `${(sim * 100).toFixed(0)}%`}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div key={v} className="w-6 h-3 rounded-sm" style={{ background: cellColor(v) }} />
            ))}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Low → High similarity</span>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [headlines, setHeadlines] = useState(["", "", ""]);
  const [industry, setIndustry] = useState("");
  const [mediaType, setMediaType] = useState("digital");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  function addHeadline() { if (headlines.length < 10) setHeadlines([...headlines, ""]); }
  function removeHeadline(i: number) { if (headlines.length > 2) setHeadlines(headlines.filter((_, j) => j !== i)); }
  function updateHeadline(i: number, v: string) { const u = [...headlines]; u[i] = v; setHeadlines(u); }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const filled = headlines.filter((h) => h.trim());
    if (filled.length < 2) return;
    setLoading(true);
    const res = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ headlines: filled, industry, media_type: mediaType }) });
    setResult(await res.json());
    setLoading(false);
  }

  const inputClass = "flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] text-[var(--foreground)] placeholder-[var(--text-muted)]";
  const selectClass = "bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--foreground)]";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <p className="text-[var(--text-muted)] text-sm tracking-[0.2em] uppercase mb-2">Comparative Analysis</p>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Compare Headlines</h1>
        <p className="text-[var(--text-muted)] mt-3">Enter 2-10 headlines. We measure semantic distance and rank by estimated originality.</p>
      </div>

      <form onSubmit={handleCompare} className="space-y-4">
        {headlines.map((h, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-[var(--text-muted)] text-sm font-mono w-6 shrink-0">{i + 1}.</span>
            <input type="text" value={h} onChange={(e) => updateHeadline(i, e.target.value)} placeholder={`Headline option ${i + 1}`} className={inputClass} />
            {headlines.length > 2 && (
              <button type="button" onClick={() => removeHeadline(i)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        ))}
        {headlines.length < 10 && (
          <button type="button" onClick={addHeadline} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            <Plus className="w-4 h-4" /> Add another
          </button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
            <option value="">Industry (optional)</option>
            {["automotive", "tech", "fmcg", "finance", "healthcare", "retail", "food", "fashion", "travel", "entertainment"].map((v) => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} className={selectClass}>
            {["digital", "print", "video", "radio", "social", "outdoor"].map((v) => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading || headlines.filter((h) => h.trim()).length < 2}
          className="w-full gradient-accent text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</> : <><ArrowUpDown className="w-4 h-4" /> Compare</>}
        </button>
      </form>

      {result && (
        <div className="space-y-8">
          {/* Recommendation */}
          <div className="card-glow rounded-xl p-6">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--accent)] mb-2">Recommendation</p>
            <p className="leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>{result.analysis.recommendation}</p>
          </div>

          {/* Ranking */}
          <div className="space-y-3">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Originality Ranking</h2>
            {result.analysis.ranking.map((r) => (
              <div key={r.rank} className={`card-primary rounded-xl p-5 ${r.rank === 1 ? "card-glow" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${r.rank === 1 ? "gradient-accent" : "bg-[var(--surface-2)]"}`}>
                      {r.rank === 1 ? <Trophy className="w-4 h-4 text-white" /> : <span className="text-sm font-mono text-[var(--text-muted)]">#{r.rank}</span>}
                    </div>
                    <div>
                      <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>&ldquo;{r.headline}&rdquo;</p>
                      <p className="text-sm text-green-400/80 mt-1.5">{r.strengths}</p>
                      <p className="text-sm text-red-400/60 mt-1">{r.risks}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold font-mono shrink-0" style={{
                    color: r.originality_estimate >= 80 ? "#4ade80" : r.originality_estimate >= 60 ? "#34d399" : r.originality_estimate >= 40 ? "#eab308" : "#ef4444"
                  }}>{r.originality_estimate}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Heat Map */}
          <div className="card-primary rounded-xl p-6">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] mb-4">Similarity Heat Map</h2>
            <HeatMap headlines={headlines.filter((h) => h.trim())} similarities={result.similarities} />
          </div>

          {/* Pairwise Notes */}
          {result.analysis.pairwise_notes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Pairwise Notes</h2>
              {result.analysis.pairwise_notes.map((p, i) => (
                <div key={i} className="card-primary rounded-lg p-3 text-sm">
                  <span className="font-mono text-[var(--accent)]">{p.pair}</span>
                  <span className="text-[var(--text-muted)] ml-2">{p.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
