"use client";

import { useState, useEffect } from "react";
import { Loader2, Zap, TrendingUp, Brain, Heart, Eye, MessageSquare, MousePointerClick } from "lucide-react";

interface EffectivenessDimension {
  score: number;
  explanation: string;
}

interface EffectivenessScore {
  overall: number;
  dimensions: {
    attention: EffectivenessDimension;
    persuasion: EffectivenessDimension;
    brand_recall: EffectivenessDimension;
    emotional_resonance: EffectivenessDimension;
    clarity: EffectivenessDimension;
    call_to_action: EffectivenessDimension;
  };
  predicted_performance: "HIGH" | "ABOVE AVERAGE" | "AVERAGE" | "BELOW AVERAGE" | "LOW";
  improvement_suggestions: string[];
  copywriting_techniques_used: string[];
  copywriting_techniques_missing: string[];
}

function AnimatedGauge({ score, size = 180 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const targetOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#34d399" : score >= 40 ? "#eab308" : "#ef4444";
  const glowColor = score >= 80 ? "rgba(74,222,128,0.3)" : score >= 60 ? "rgba(52,211,153,0.3)" : score >= 40 ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)";

  useEffect(() => {
    const timer = setTimeout(() => setOffset(targetOffset), 200);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 20px ${glowColor})` }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth="10" fill="none" opacity="0.5" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </svg>
    </div>
  );
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 50));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      setValue(current);
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <>{value}</>;
}

function DimensionBar({ score, label, icon, weight, delay }: { score: number; label: string; icon: React.ReactNode; weight: string; delay: number }) {
  const [width, setWidth] = useState(0);
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#34d399" : score >= 40 ? "#eab308" : "#ef4444";

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return (
    <div className="space-y-1.5 animate-fade-up opacity-0" style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)]">{icon}</span>
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>{label}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{weight}</span>
        </div>
        <span className="text-sm font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
        />
      </div>
    </div>
  );
}

function DimensionExplanation({ dimension, label, icon }: { dimension: EffectivenessDimension; label: string; icon: React.ReactNode }) {
  const color = dimension.score >= 80 ? "text-green-400" : dimension.score >= 60 ? "text-emerald-400" : dimension.score >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)]">
      <span className="text-[var(--accent)] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>{label}</span>
          <span className={`text-xs font-mono font-bold ${color}`}>{dimension.score}</span>
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{dimension.explanation}</p>
      </div>
    </div>
  );
}

export default function EffectivenessPage() {
  const [form, setForm] = useState({ headline: "", body_copy: "", script: "", industry: "", media_type: "digital" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EffectivenessScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/effectiveness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Prediction failed");
      }
      const data: EffectivenessScore = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const performanceBadge = (perf: string) => {
    const styles: Record<string, string> = {
      HIGH: "text-green-400 border-green-400/30 bg-green-400/10",
      "ABOVE AVERAGE": "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
      AVERAGE: "text-amber-400 border-amber-400/30 bg-amber-400/10",
      "BELOW AVERAGE": "text-orange-400 border-orange-400/30 bg-orange-400/10",
      LOW: "text-red-400 border-red-400/30 bg-red-400/10",
    };
    return styles[perf] || styles.AVERAGE;
  };

  const selectClass = "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]";
  const inputClass = "w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="text-[var(--text-muted)] text-sm tracking-[0.2em] uppercase mb-2">Creative Analysis</p>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Effectiveness Prediction</h1>
        <p className="text-[var(--text-muted)] mt-3 leading-relaxed max-w-xl">
          Predict how your ad will perform using AI-powered analysis of copywriting techniques, persuasion psychology, and creative effectiveness signals.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Headline <span className="text-[var(--accent)]">*</span></label>
          <input type="text" required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Your ad headline" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Body Copy</label>
          <textarea value={form.body_copy} onChange={(e) => setForm({ ...form, body_copy: e.target.value })} placeholder="Ad body copy / description" rows={3} className={`${inputClass} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Script <span className="text-xs text-[var(--text-muted)]">(video/radio)</span></label>
          <textarea value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="Full script / voiceover text" rows={4} className={`${inputClass} resize-none`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Industry <span className="text-[var(--accent)]">*</span></label>
            <select required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={selectClass}>
              <option value="">Select...</option>
              {["automotive", "tech", "fmcg", "finance", "healthcare", "retail", "food", "fashion", "travel", "entertainment"].map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Media Type <span className="text-[var(--accent)]">*</span></label>
            <select required value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })} className={selectClass}>
              {["digital", "print", "video", "radio", "social", "outdoor"].map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full gradient-accent text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4" /> Predict Effectiveness</>}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="card-primary rounded-xl p-4 border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Overall Score Hero */}
          <div className={`card-elevated rounded-2xl p-10 bg-gradient-to-b ${
            result.overall >= 80 ? "from-green-500/5" : result.overall >= 60 ? "from-emerald-500/5" : result.overall >= 40 ? "from-amber-500/5" : "from-red-500/5"
          } to-transparent border ${
            result.overall >= 80 ? "border-green-500/20" : result.overall >= 60 ? "border-emerald-500/20" : result.overall >= 40 ? "border-amber-500/20" : "border-red-500/20"
          } relative overflow-hidden noise-bg`}>
            <div className="relative z-10 flex items-center gap-10">
              <div className="relative animate-score-reveal">
                <AnimatedGauge score={result.overall} size={180} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold font-mono" style={{ color: result.overall >= 80 ? "#4ade80" : result.overall >= 60 ? "#34d399" : result.overall >= 40 ? "#eab308" : "#ef4444" }}>
                    <AnimatedNumber target={result.overall} />
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">effectiveness</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 animate-verdict-slide" style={{ animationDelay: "0.3s", animationFillMode: "forwards", opacity: 0 }}>
                <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${performanceBadge(result.predicted_performance)}`} style={{ fontFamily: "var(--font-display)" }}>
                  {result.predicted_performance} PERFORMER
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed text-sm">
                  Predicted creative effectiveness based on copywriting technique analysis, persuasion psychology, and advertising effectiveness research.
                </p>
              </div>
            </div>
          </div>

          {/* Dimension Bars */}
          <div className="card-primary rounded-xl p-6 space-y-5">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Dimension Scores</h2>
            <DimensionBar score={result.dimensions.attention.score} label="Attention" icon={<Eye className="w-4 h-4" />} weight="25%" delay={0} />
            <DimensionBar score={result.dimensions.persuasion.score} label="Persuasion" icon={<TrendingUp className="w-4 h-4" />} weight="25%" delay={100} />
            <DimensionBar score={result.dimensions.brand_recall.score} label="Brand Recall" icon={<Brain className="w-4 h-4" />} weight="20%" delay={200} />
            <DimensionBar score={result.dimensions.emotional_resonance.score} label="Emotional Resonance" icon={<Heart className="w-4 h-4" />} weight="15%" delay={300} />
            <DimensionBar score={result.dimensions.clarity.score} label="Clarity" icon={<MessageSquare className="w-4 h-4" />} weight="10%" delay={400} />
            <DimensionBar score={result.dimensions.call_to_action.score} label="Call to Action" icon={<MousePointerClick className="w-4 h-4" />} weight="5%" delay={500} />
          </div>

          {/* Dimension Explanations */}
          <div className="card-primary rounded-xl p-6 space-y-3">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Detailed Analysis</h2>
            <DimensionExplanation dimension={result.dimensions.attention} label="Attention" icon={<Eye className="w-4 h-4" />} />
            <DimensionExplanation dimension={result.dimensions.persuasion} label="Persuasion" icon={<TrendingUp className="w-4 h-4" />} />
            <DimensionExplanation dimension={result.dimensions.brand_recall} label="Brand Recall" icon={<Brain className="w-4 h-4" />} />
            <DimensionExplanation dimension={result.dimensions.emotional_resonance} label="Emotional Resonance" icon={<Heart className="w-4 h-4" />} />
            <DimensionExplanation dimension={result.dimensions.clarity} label="Clarity" icon={<MessageSquare className="w-4 h-4" />} />
            <DimensionExplanation dimension={result.dimensions.call_to_action} label="Call to Action" icon={<MousePointerClick className="w-4 h-4" />} />
          </div>

          {/* Techniques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card-primary rounded-xl p-6 space-y-3">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Techniques Used</h2>
              <div className="flex flex-wrap gap-2">
                {result.copywriting_techniques_used.map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    {t}
                  </span>
                ))}
                {result.copywriting_techniques_used.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)] italic">No recognized techniques detected</span>
                )}
              </div>
            </div>
            <div className="card-primary rounded-xl p-6 space-y-3">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Techniques Missing</h2>
              <div className="flex flex-wrap gap-2">
                {result.copywriting_techniques_missing.map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="card-primary rounded-xl p-6 space-y-4">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Improvement Suggestions</h2>
            <ol className="space-y-3">
              {result.improvement_suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-[var(--accent)] mt-0.5 shrink-0 w-5">{i + 1}.</span>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
