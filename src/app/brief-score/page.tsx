"use client";

import { useState } from "react";
import { FileText, Loader2, AlertTriangle, CheckCircle, Target, Lightbulb, Ruler, BarChart3, Users, Copy, RefreshCw } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { VoiceErrorBoundary } from "@/components/voice-error-boundary";

interface BriefDimension { score: number; explanation: string; }
interface BriefScoreResult {
  overall_score: number;
  verdict: "SHARP" | "DECENT" | "GENERIC" | "VAGUE";
  summary: string;
  dimensions: { specificity: BriefDimension; differentiation: BriefDimension; creative_latitude: BriefDimension; measurability: BriefDimension; audience_clarity: BriefDimension; };
  predicted_agency_convergence: number;
  convergence_explanation: string;
  top_5_predictable_ideas: string[];
  rewrite_suggestions: string[];
  sharpened_brief: string;
}

function ScoreBar({ score, label, icon, weight }: { score: number; label: string; icon: React.ReactNode; weight: string }) {
  const c = score >= 80 ? "#16a34a" : score >= 60 ? "#059669" : score >= 40 ? "#ca8a04" : "#dc2626";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-36 shrink-0 text-[var(--text-muted)]">{icon}<span className="text-xs">{label}</span><span className="text-[10px] opacity-60">{weight}</span></div>
      <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: c }} />
      </div>
      <span className="text-sm font-mono font-bold w-8 text-right" style={{ color: c }}>{score}</span>
    </div>
  );
}

export default function BriefScorePage() {
  const [form, setForm] = useState({ description: "", industry: "", target_audience: "", objective: "", media_type: "digital", tone: "", constraints: "", budget_context: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/brief-score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setResult(await res.json());
    setLoading(false);
  }

  function copySharpened() {
    if (result?.sharpened_brief) {
      navigator.clipboard.writeText(result.sharpened_brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const verdictColor = (v: string) => {
    if (v === "SHARP") return "text-green-600 border-green-600/30 bg-green-600/10";
    if (v === "DECENT") return "text-emerald-600 border-emerald-600/30 bg-emerald-600/10";
    if (v === "GENERIC") return "text-amber-600 border-amber-600/30 bg-amber-600/10";
    return "text-red-600 border-red-600/30 bg-red-600/10";
  };

  const inputClass = "w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all text-sm";
  const selectClass = "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT: Brief Form */}
        <div>
          <form onSubmit={handleSubmit} className="card-primary rounded-xl p-5 space-y-4">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Your Brief</p>

            <div>
              <label className="block text-xs font-medium mb-1.5">Brief Description <span className="text-[var(--accent)]">*</span></label>
              <div className="flex gap-2 items-start">
                <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={`${inputClass} resize-none flex-1`} />
                <VoiceErrorBoundary><VoiceInput onTranscript={(t) => setForm((f) => ({ ...f, description: t }))} className="mt-0.5" /></VoiceErrorBoundary>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Industry <span className="text-[var(--accent)]">*</span></label>
                <select required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={selectClass}>
                  <option value="">Select...</option>
                  {["automotive", "tech", "fmcg", "finance", "healthcare", "retail", "food", "fashion", "travel", "entertainment"].map((v) => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Media Type <span className="text-[var(--accent)]">*</span></label>
                <select required value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })} className={selectClass}>
                  {["digital", "print", "video", "radio", "social", "outdoor"].map((v) => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Target Audience <span className="text-[var(--accent)]">*</span></label>
              <input type="text" required value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Campaign Objective <span className="text-[var(--accent)]">*</span></label>
              <input type="text" required value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Desired Tone</label>
                <input type="text" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} placeholder="e.g. Bold, humorous" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Budget Context</label>
                <input type="text" value={form.budget_context} onChange={(e) => setForm({ ...form, budget_context: e.target.value })} placeholder="e.g. $500K, global" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Constraints</label>
              <input type="text" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="e.g. Must include product shot, no humor" className={inputClass} />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-purple py-2.5 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Scoring brief...</> : <><FileText className="w-4 h-4" /> Score This Brief</>}
            </button>
          </form>
        </div>

        {/* RIGHT: Info */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Brief <span className="gradient-accent-text">Score</span>
            </h1>
            <p className="text-[var(--text-muted)] mt-2 text-sm leading-relaxed">
              Score your creative brief before it goes to the agency. A generic brief produces generic work. We predict how many agencies would converge on the same ideas and show you how to sharpen it.
            </p>
          </div>

          <div className="card-primary rounded-xl p-4 space-y-3">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">What we evaluate</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><Target className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" /><span className="text-[var(--text-muted)]"><span className="text-[var(--foreground)] font-medium">Specificity</span> — Is the direction precise enough to produce focused work?</span></div>
              <div className="flex items-start gap-2"><Lightbulb className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" /><span className="text-[var(--text-muted)]"><span className="text-[var(--foreground)] font-medium">Differentiation</span> — Could this brief be for any competitor?</span></div>
              <div className="flex items-start gap-2"><Ruler className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" /><span className="text-[var(--text-muted)]"><span className="text-[var(--foreground)] font-medium">Creative Latitude</span> — Room for surprise without losing focus?</span></div>
              <div className="flex items-start gap-2"><BarChart3 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" /><span className="text-[var(--text-muted)]"><span className="text-[var(--foreground)] font-medium">Measurability</span> — Can you tell when the campaign succeeds?</span></div>
              <div className="flex items-start gap-2"><Users className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" /><span className="text-[var(--text-muted)]"><span className="text-[var(--foreground)] font-medium">Audience Clarity</span> — Real humans or a demographic spreadsheet?</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <div className="border-t border-[var(--border)] pt-8 space-y-6">
          {/* Score + Verdict */}
          <div className="card-elevated rounded-xl p-8">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-5xl font-bold font-mono" style={{ color: result.overall_score >= 80 ? "#16a34a" : result.overall_score >= 60 ? "#059669" : result.overall_score >= 40 ? "#ca8a04" : "#dc2626" }}>{result.overall_score}</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-2 ${verdictColor(result.verdict)}`} style={{ fontFamily: "var(--font-display)" }}>{result.verdict}</div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dimensions */}
            <div className="card-primary rounded-xl p-5 space-y-4">
              <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Dimensions</p>
              <div className="space-y-3">
                <ScoreBar score={result.dimensions.specificity.score} label="Specificity" icon={<Target className="w-3 h-3" />} weight="25%" />
                <ScoreBar score={result.dimensions.differentiation.score} label="Differentiation" icon={<Lightbulb className="w-3 h-3" />} weight="25%" />
                <ScoreBar score={result.dimensions.creative_latitude.score} label="Creative Latitude" icon={<Ruler className="w-3 h-3" />} weight="20%" />
                <ScoreBar score={result.dimensions.measurability.score} label="Measurability" icon={<BarChart3 className="w-3 h-3" />} weight="15%" />
                <ScoreBar score={result.dimensions.audience_clarity.score} label="Audience Clarity" icon={<Users className="w-3 h-3" />} weight="15%" />
              </div>
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                {Object.entries(result.dimensions).map(([key, dim]) => (
                  <p key={key} className="text-xs text-[var(--text-muted)] leading-relaxed">{dim.explanation}</p>
                ))}
              </div>
            </div>

            {/* Agency Convergence */}
            <div className="space-y-4">
              <div className={`card-elevated rounded-xl p-5 space-y-3 ${result.predicted_agency_convergence >= 70 ? "border-red-500/20" : result.predicted_agency_convergence >= 40 ? "border-amber-500/20" : "border-green-500/20"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Agency Convergence</p>
                  <div className="flex items-center gap-2">
                    {result.predicted_agency_convergence >= 70 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : result.predicted_agency_convergence < 40 ? <CheckCircle className="w-4 h-4 text-green-500" /> : null}
                    <span className="text-2xl font-bold font-mono" style={{ color: result.predicted_agency_convergence >= 70 ? "#dc2626" : result.predicted_agency_convergence >= 40 ? "#ca8a04" : "#16a34a" }}>{result.predicted_agency_convergence}%</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{result.convergence_explanation}</p>
                <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${result.predicted_agency_convergence}%`, backgroundColor: result.predicted_agency_convergence >= 70 ? "#dc2626" : result.predicted_agency_convergence >= 40 ? "#ca8a04" : "#16a34a" }} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {result.predicted_agency_convergence >= 70 ? "Most agencies will produce the same work from this brief." : result.predicted_agency_convergence >= 40 ? "Some overlap expected, but room for differentiation." : "This brief is specific enough to produce diverse, original work."}
                </p>
              </div>

              {/* Predictable Ideas */}
              <div className="card-primary rounded-xl p-5 space-y-3">
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Most Predictable Ideas</p>
                <p className="text-[10px] text-[var(--text-muted)]">These are the first 5 ideas any agency would produce from your brief:</p>
                {result.top_5_predictable_ideas.map((idea, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                    <span className="text-[10px] font-mono font-bold text-red-500 mt-0.5">#{i + 1}</span>
                    <p className="text-xs text-[var(--text-muted)]">{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestions + Sharpened Brief */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-primary rounded-xl p-5 space-y-3">
              <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">How to Sharpen This Brief</p>
              {result.rewrite_suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono font-bold text-[var(--accent)] mt-0.5">{i + 1}.</span>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s}</p>
                </div>
              ))}
            </div>

            <div className="card-glow rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Sharpened Brief
                </p>
                <button onClick={copySharpened} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                  <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm leading-relaxed">{result.sharpened_brief}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
