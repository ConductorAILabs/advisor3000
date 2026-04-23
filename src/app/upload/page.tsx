"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle, Gavel, Lightbulb, Type, Target, Clapperboard, Bot, AlertTriangle, Zap, Eye, TrendingUp, Brain, Heart, MessageSquare, MousePointerClick } from "lucide-react";
import { AnimatedGauge, AnimatedNumber } from "@/components/animated-gauge";
import { DimensionRadial, DimensionDetail, type DimensionScore } from "@/components/dimension-display";
import { PredictabilitySpectrum, type CampaignIdea } from "@/components/predictability";
import { FileUploadZone, type ExtractedCampaign, type FileExtractionResult } from "@/components/file-upload";
import { BenchmarkCard, type IndustryBenchmark } from "@/components/benchmark-card";

interface Predictability { is_predictable: boolean; closest_match_index: number | null; closest_match_headline: string | null; similarity_explanation: string; predictability_tier: "top5" | "top10" | "top15" | "top20" | "none"; penalty: number; ideas: CampaignIdea[]; brief_provided?: boolean; }
interface EffectivenessDimension { score: number; explanation: string; }
interface EffectivenessScore { overall: number; dimensions: { attention: EffectivenessDimension; persuasion: EffectivenessDimension; brand_recall: EffectivenessDimension; emotional_resonance: EffectivenessDimension; clarity: EffectivenessDimension; call_to_action: EffectivenessDimension; }; predicted_performance: "HIGH" | "ABOVE AVERAGE" | "AVERAGE" | "BELOW AVERAGE" | "LOW"; improvement_suggestions: string[]; copywriting_techniques_used: string[]; copywriting_techniques_missing: string[]; }
interface AdjudgeVerdict { overall_score: number; pre_penalty_score?: number; verdict: string; summary: string; total_ads_compared?: number; search_sources?: string[]; dimensions: { concept: DimensionScore; language: DimensionScore; strategy: DimensionScore; execution: DimensionScore; }; predictability?: Predictability; benchmark?: IndustryBenchmark; effectiveness?: EffectivenessScore; methodology: string; }

export default function UploadPage() {
  const [form, setForm] = useState({ headline: "", body_copy: "", script: "", industry: "", media_type: "digital", language: "en", brief: "", target_audience: "", objective: "" });
  const [uploading, setUploading] = useState(false);
  const [judging, setJudging] = useState(false);
  const [judgeStep, setJudgeStep] = useState(0);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<AdjudgeVerdict | null>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setCampaignId(data.id);
    setUploading(false);
  }

  async function handleJudge() {
    if (!campaignId) return;
    setJudging(true);
    setJudgeStep(1);
    const t1 = setTimeout(() => setJudgeStep(2), 3000);
    const t2 = setTimeout(() => setJudgeStep(3), 7000);
    const t3 = setTimeout(() => setJudgeStep(4), 12000);
    const t4 = setTimeout(() => setJudgeStep(5), 18000);
    const res = await fetch("/api/judge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaignId }) });
    const data = await res.json();
    [t1, t2, t3, t4].forEach(clearTimeout);
    setVerdict(data);
    setJudging(false);
    setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  const steps = [
    { label: "Searching corpus", icon: <Target className="w-4 h-4" /> },
    { label: "Crawling web sources", icon: <Lightbulb className="w-4 h-4" /> },
    { label: "Analyzing concept & language", icon: <Type className="w-4 h-4" /> },
    { label: "Scoring strategy & execution", icon: <Clapperboard className="w-4 h-4" /> },
    { label: "AI predictability check", icon: <Bot className="w-4 h-4" /> },
  ];

  const verdictStyle = verdict ? (
    verdict.overall_score >= 80 ? { bg: "from-green-500/5 to-transparent", border: "border-green-500/20" }
    : verdict.overall_score >= 60 ? { bg: "from-emerald-500/5 to-transparent", border: "border-emerald-500/20" }
    : verdict.overall_score >= 40 ? { bg: "from-amber-500/5 to-transparent", border: "border-amber-500/20" }
    : { bg: "from-red-500/5 to-transparent", border: "border-red-500/20" }
  ) : null;

  function handleFileExtracted(_result: FileExtractionResult) {
    setCampaignId(null);
    setVerdict(null);
  }

  function handleSelectCampaign(campaign: ExtractedCampaign) {
    setForm({
      headline: campaign.headline,
      body_copy: campaign.body_copy || "",
      script: campaign.script || "",
      industry: campaign.industry || "",
      media_type: campaign.media_type || "digital",
      language: campaign.language || "en",
      brief: form.brief,
      target_audience: form.target_audience,
      objective: form.objective,
    });
    setCampaignId(null);
    setVerdict(null);
  }

  const selectClass = "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]";
  const inputClass = "w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="text-[var(--text-muted)] text-sm tracking-[0.2em] uppercase mb-2">Originality Analysis</p>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Submit Your Ad</h1>
        <p className="text-[var(--text-muted)] mt-3 leading-relaxed max-w-xl">
          Upload a file to extract campaigns automatically, or enter details manually for a comprehensive originality report.
        </p>
      </div>

      {/* File Upload Zone */}
      <FileUploadZone onCampaignsExtracted={handleFileExtracted} onSelectCampaign={handleSelectCampaign} />

      {/* Form */}
      <form onSubmit={handleUpload} className="space-y-5">
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
        {/* Brief Section */}
        <div className="border-t border-[var(--border)] pt-5">
          <p className="text-sm font-medium mb-1">Client Brief</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">Provide the original brief to enable AI predictability scoring. Without this, we can only score originality against existing ads — not whether AI could have arrived at the same idea.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Brief / Product Description</label>
              <textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="What was the agency asked to do? e.g. 'Create a global campaign for McDonald's new value menu targeting young adults. Emphasize affordability and joy.'" rows={3} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <input type="text" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} placeholder="e.g. Gen Z, health-conscious parents" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Objective</label>
                <input type="text" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Brand awareness, drive trial, rebrand" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={selectClass}>
              {["en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ar", "hi"].map((v) => (
                <option key={v} value={v}>{v.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={uploading || !!campaignId}
          className="w-full gradient-accent text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : campaignId ? <><CheckCircle className="w-4 h-4" /> Uploaded</> : <><Upload className="w-4 h-4" /> Upload Campaign</>}
        </button>
      </form>

      {/* Judge Button */}
      {campaignId && !verdict && !judging && (
        <button onClick={handleJudge} className="w-full card-elevated rounded-lg py-3.5 font-semibold hover:bg-[var(--surface-2)] transition-all flex items-center justify-center gap-2 text-[var(--foreground)]">
          <Gavel className="w-4 h-4 text-[var(--accent)]" /> Run Adjudge Analysis
        </button>
      )}

      {/* Analysis Stepper */}
      {judging && (
        <div className="card-elevated rounded-xl p-6 space-y-4 animate-pulse-glow">
          <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>Analyzing your campaign...</p>
          <div className="space-y-3">
            {steps.map((s, i) => {
              const n = i + 1;
              const active = judgeStep === n;
              const done = judgeStep > n;
              return (
                <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${active ? "text-[var(--accent)]" : done ? "text-[var(--text-muted)]" : "text-[var(--border)]"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    active ? "bg-[var(--accent)]/15 ring-2 ring-[var(--accent)]/40" : done ? "bg-[var(--surface-2)]" : "bg-[var(--surface-3)]/50"}`}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="w-1.5 h-1.5 bg-[var(--border)] rounded-full" />}
                  </div>
                  <div className="flex items-center gap-2">{s.icon}<span className="text-sm">{s.label}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verdict */}
      {verdict && verdictStyle && (
        <div ref={verdictRef} className="space-y-8">
          {/* Score Hero */}
          <div className={`card-elevated rounded-2xl p-10 bg-gradient-to-b ${verdictStyle.bg} border ${verdictStyle.border} relative overflow-hidden noise-bg`}>
            <div className="relative z-10 flex items-center gap-10">
              <div className="relative animate-score-reveal">
                <AnimatedGauge score={verdict.overall_score} size={180} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold font-mono" style={{ color: verdict.overall_score >= 80 ? "#4ade80" : verdict.overall_score >= 60 ? "#34d399" : verdict.overall_score >= 40 ? "#eab308" : "#ef4444" }}>
                    <AnimatedNumber target={verdict.overall_score} />
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">score</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 animate-verdict-slide" style={{ animationDelay: "0.3s", animationFillMode: "forwards", opacity: 0 }}>
                <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${
                  verdict.verdict.includes("HIGHLY ORIGINAL") ? "text-green-400 border-green-400/30 bg-green-400/10"
                  : verdict.verdict.includes("MOSTLY ORIGINAL") ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                  : verdict.verdict.includes("SOMEWHAT") ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
                  : "text-red-400 border-red-400/30 bg-red-400/10"
                }`} style={{ fontFamily: "var(--font-display)" }}>{verdict.verdict}</div>
                <p className="text-[var(--text-muted)] leading-relaxed">{verdict.summary}</p>
                {verdict.total_ads_compared && (
                  <p className="text-xs text-[var(--text-muted)] opacity-60">{verdict.total_ads_compared} ads compared across {verdict.search_sources?.length || 0} sources</p>
                )}
              </div>
            </div>
          </div>

          {/* Dimension Radials */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            <DimensionRadial score={verdict.dimensions.concept.score} label="Concept" icon={<Lightbulb className="w-3.5 h-3.5" />} weight="40%" delay={400} />
            <DimensionRadial score={verdict.dimensions.language.score} label="Language" icon={<Type className="w-3.5 h-3.5" />} weight="25%" delay={550} />
            <DimensionRadial score={verdict.dimensions.strategy.score} label="Strategy" icon={<Target className="w-3.5 h-3.5" />} weight="20%" delay={700} />
            <DimensionRadial score={verdict.dimensions.execution.score} label="Execution" icon={<Clapperboard className="w-3.5 h-3.5" />} weight="15%" delay={850} />
          </div>

          {/* Industry Benchmark */}
          {verdict.benchmark && verdict.benchmark.total_scored > 0 && (
            <BenchmarkCard benchmark={verdict.benchmark} score={verdict.overall_score} />
          )}

          {/* Detailed Breakdown */}
          <div className="space-y-3">
            <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)]">Detailed Analysis</h2>
            <DimensionDetail label="Concept" icon={<Lightbulb className="w-5 h-5" />} weight="40%" dimension={verdict.dimensions.concept} />
            <DimensionDetail label="Language" icon={<Type className="w-5 h-5" />} weight="25%" dimension={verdict.dimensions.language} />
            <DimensionDetail label="Strategy" icon={<Target className="w-5 h-5" />} weight="20%" dimension={verdict.dimensions.strategy} />
            <DimensionDetail label="Execution" icon={<Clapperboard className="w-5 h-5" />} weight="15%" dimension={verdict.dimensions.execution} />
          </div>

          {/* AI Predictability */}
          {verdict.predictability && (
            <div className="space-y-4">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] flex items-center gap-2">
                <Bot className="w-4 h-4" /> AI Predictability
                {!verdict.predictability.brief_provided && (
                  <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded-full normal-case tracking-normal">brief required</span>
                )}
              </h2>
              {!verdict.predictability.brief_provided ? (
                <div className="card-primary rounded-xl p-6">
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    No client brief was provided. The AI predictability check compares your agency&apos;s creative response against 20 AI-generated ideas from the <em>same brief</em>. Without the original brief, we can&apos;t determine if AI would independently arrive at the same concept. Re-submit with the brief to enable this check.
                  </p>
                </div>
              ) : (
              <div className={`card-elevated rounded-xl p-6 space-y-4 ${verdict.predictability.is_predictable ? "border-red-500/20" : "border-green-500/20"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    {verdict.predictability.is_predictable ? (
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="font-semibold text-red-400" style={{ fontFamily: "var(--font-display)" }}>AI predicted this idea from the same brief</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-semibold text-green-400" style={{ fontFamily: "var(--font-display)" }}>Beyond AI prediction</span>
                      </div>
                    )}
                    <p className="text-sm text-[var(--text-muted)]">{verdict.predictability.similarity_explanation}</p>
                  </div>
                  {verdict.predictability.penalty !== 0 && (
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-2xl font-bold font-mono text-red-400">{verdict.predictability.penalty}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">penalty</p>
                    </div>
                  )}
                </div>
                {verdict.predictability.ideas.length > 0 && (
                  <PredictabilitySpectrum ideas={verdict.predictability.ideas} matchIndex={verdict.predictability.closest_match_index} />
                )}
                {verdict.pre_penalty_score && verdict.predictability.penalty !== 0 && (
                  <p className="text-xs text-[var(--text-muted)]">Score: {verdict.pre_penalty_score} &rarr; {verdict.overall_score} ({verdict.predictability.penalty}pts)</p>
                )}
              </div>
              )}
            </div>
          )}

          {/* Effectiveness Prediction */}
          {verdict.effectiveness && (
            <div className="space-y-4">
              <h2 className="text-sm tracking-[0.15em] uppercase text-[var(--text-muted)] flex items-center gap-2">
                <Zap className="w-4 h-4" /> Effectiveness Prediction
              </h2>
              <div className="card-elevated rounded-xl p-6 space-y-5">
                {/* Overall + Performance Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <AnimatedGauge score={verdict.effectiveness.overall} size={80} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold font-mono" style={{ color: verdict.effectiveness.overall >= 80 ? "#4ade80" : verdict.effectiveness.overall >= 60 ? "#34d399" : verdict.effectiveness.overall >= 40 ? "#eab308" : "#ef4444" }}>
                          {verdict.effectiveness.overall}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Effectiveness Score</p>
                      <p className="text-xs text-[var(--text-muted)]">Predicted creative performance</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    verdict.effectiveness.predicted_performance === "HIGH" ? "text-green-400 border-green-400/30 bg-green-400/10"
                    : verdict.effectiveness.predicted_performance === "ABOVE AVERAGE" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                    : verdict.effectiveness.predicted_performance === "AVERAGE" ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
                    : verdict.effectiveness.predicted_performance === "BELOW AVERAGE" ? "text-orange-400 border-orange-400/30 bg-orange-400/10"
                    : "text-red-400 border-red-400/30 bg-red-400/10"
                  }`} style={{ fontFamily: "var(--font-display)" }}>
                    {verdict.effectiveness.predicted_performance}
                  </div>
                </div>

                {/* Compact Dimension Bars */}
                <div className="space-y-3">
                  {([
                    { key: "attention" as const, label: "Attention", icon: <Eye className="w-3.5 h-3.5" />, weight: "25%" },
                    { key: "persuasion" as const, label: "Persuasion", icon: <TrendingUp className="w-3.5 h-3.5" />, weight: "25%" },
                    { key: "brand_recall" as const, label: "Brand Recall", icon: <Brain className="w-3.5 h-3.5" />, weight: "20%" },
                    { key: "emotional_resonance" as const, label: "Emotional Resonance", icon: <Heart className="w-3.5 h-3.5" />, weight: "15%" },
                    { key: "clarity" as const, label: "Clarity", icon: <MessageSquare className="w-3.5 h-3.5" />, weight: "10%" },
                    { key: "call_to_action" as const, label: "Call to Action", icon: <MousePointerClick className="w-3.5 h-3.5" />, weight: "5%" },
                  ]).map(({ key, label, icon, weight }) => {
                    const dim = verdict.effectiveness!.dimensions[key];
                    const barColor = dim.score >= 80 ? "#4ade80" : dim.score >= 60 ? "#34d399" : dim.score >= 40 ? "#eab308" : "#ef4444";
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--accent)]">{icon}</span>
                            <span className="text-xs font-medium">{label}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{weight}</span>
                          </div>
                          <span className="text-xs font-bold font-mono" style={{ color: barColor }}>{dim.score}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: barColor, transition: "width 1s ease-out" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Techniques Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Techniques Used</p>
                    <div className="flex flex-wrap gap-1.5">
                      {verdict.effectiveness.copywriting_techniques_used.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Techniques Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {verdict.effectiveness.copywriting_techniques_missing.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top 3 Improvement Suggestions */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Top Improvements</p>
                  {verdict.effectiveness.improvement_suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--accent)] mt-0.5 shrink-0">{i + 1}.</span>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Methodology */}
          <div className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-6 space-y-2 opacity-60">
            <p className="text-center">{verdict.methodology}</p>
            <p className="text-center">Adjudge Score = Concept (40%) + Language (25%) + Strategy (20%) + Execution (15%)</p>
            <p className="text-center mt-2">Results reflect the discoverable public record, not all advertising ever produced.</p>
          </div>
        </div>
      )}
    </div>
  );
}
