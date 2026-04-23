"use client";

import { useState, useRef } from "react";
import {
  Upload, Loader2, CheckCircle, Lightbulb, Type, Target, Clapperboard,
  Bot, AlertTriangle, Zap, Eye, TrendingUp, Brain, Heart, MessageSquare,
  MousePointerClick, Sparkles, BarChart3, Search, Play
} from "lucide-react";
import { AnimatedGauge, AnimatedNumber } from "@/components/animated-gauge";
import { DimensionRadial, DimensionDetail, type DimensionScore } from "@/components/dimension-display";
import { PredictabilitySpectrum, type CampaignIdea } from "@/components/predictability";
import { FileUploadZone, type ExtractedCampaign, type FileExtractionResult } from "@/components/file-upload";
import { BenchmarkCard, type IndustryBenchmark } from "@/components/benchmark-card";
import { VoiceVerdict } from "@/components/voice-verdict";
import { VoiceInput } from "@/components/voice-input";
import { VoiceErrorBoundary } from "@/components/voice-error-boundary";

interface Predictability { is_predictable: boolean; closest_match_index: number | null; closest_match_headline: string | null; similarity_explanation: string; predictability_tier: "top5" | "top10" | "top15" | "top20" | "none"; penalty: number; ideas: CampaignIdea[]; brief_provided?: boolean; }
interface EffectivenessDimension { score: number; explanation: string; }
interface EffectivenessScore { overall: number; dimensions: { attention: EffectivenessDimension; persuasion: EffectivenessDimension; brand_recall: EffectivenessDimension; emotional_resonance: EffectivenessDimension; clarity: EffectivenessDimension; call_to_action: EffectivenessDimension; }; predicted_performance: "HIGH" | "ABOVE AVERAGE" | "AVERAGE" | "BELOW AVERAGE" | "LOW"; improvement_suggestions: string[]; copywriting_techniques_used: string[]; copywriting_techniques_missing: string[]; }
interface AdjudgeVerdict { overall_score: number; pre_penalty_score?: number; verdict: string; summary: string; total_ads_compared?: number; search_sources?: string[]; dimensions: { concept: DimensionScore; language: DimensionScore; strategy: DimensionScore; execution: DimensionScore; }; predictability?: Predictability; benchmark?: IndustryBenchmark; effectiveness?: EffectivenessScore; methodology: string; }

type TabKey = "originality" | "effectiveness" | "predictability" | "benchmark" | "ideas";

const ANALYSIS_OPTIONS = [
  { id: "originality", label: "Originality", icon: <Search className="w-4 h-4" />, requiresBrief: false, defaultChecked: true },
  { id: "effectiveness", label: "Effectiveness", icon: <Zap className="w-4 h-4" />, requiresBrief: false, defaultChecked: true },
  { id: "predictability", label: "AI Predictability", icon: <Bot className="w-4 h-4" />, requiresBrief: true, defaultChecked: false },
  { id: "benchmark", label: "Benchmark", icon: <BarChart3 className="w-4 h-4" />, requiresBrief: false, defaultChecked: true },
  { id: "ideas", label: "Generate Ideas", icon: <Sparkles className="w-4 h-4" />, requiresBrief: true, defaultChecked: false },
];

export default function AnalyzePage() {
  const [form, setForm] = useState({ headline: "", body_copy: "", script: "", industry: "", media_type: "digital", language: "en", brief: "", target_audience: "", objective: "" });
  const [uploading, setUploading] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set(["originality", "effectiveness", "benchmark"]));
  const [running, setRunning] = useState(false);
  const [runStep, setRunStep] = useState("");
  const [verdict, setVerdict] = useState<AdjudgeVerdict | null>(null);
  const [ideateIdeas, setIdeateIdeas] = useState<CampaignIdea[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("originality");
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasBrief = form.brief.trim().length > 0;

  function toggleAnalysis(id: string) {
    setSelectedAnalyses((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function handleFileExtracted(_result: FileExtractionResult) { setCampaignId(null); setVerdict(null); setIdeateIdeas(null); }

  function handleSelectCampaign(campaign: ExtractedCampaign) {
    setForm({ headline: campaign.headline, body_copy: campaign.body_copy || "", script: campaign.script || "", industry: campaign.industry || "", media_type: campaign.media_type || "digital", language: campaign.language || "en", brief: form.brief, target_audience: form.target_audience, objective: form.objective });
    setCampaignId(null); setVerdict(null); setIdeateIdeas(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      setCampaignId(data.id);
    } finally { setUploading(false); }
  }

  async function handleRunAnalysis() {
    if (!campaignId || selectedAnalyses.size === 0) return;
    setRunning(true); setVerdict(null); setIdeateIdeas(null);
    try {
      const needsJudge = selectedAnalyses.has("originality") || selectedAnalyses.has("effectiveness") || selectedAnalyses.has("benchmark") || selectedAnalyses.has("predictability");
      if (needsJudge) {
        setRunStep("Queuing analysis...");
        const enqRes = await fetch("/api/judge/enqueue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaignId }) });
        const { job_id } = await enqRes.json();

        setRunStep("Analyzing your campaign...");
        let result = null;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const poll = await fetch(`/api/judge/poll?job_id=${job_id}`);
          const data = await poll.json();
          if (data.status === "complete") { result = data.result; break; }
          if (data.status === "error") throw new Error(data.error || "Analysis failed");
        }
        if (!result) throw new Error("Analysis timed out");
        setVerdict(result);
      }
      if (selectedAnalyses.has("ideas") && hasBrief) {
        setRunStep("Generating ideas...");
        const res = await fetch("/api/ideate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: form.brief, industry: form.industry, target_audience: form.target_audience, objective: form.objective, media_type: form.media_type }) });
        const data = await res.json();
        setIdeateIdeas(data.ideas || []);
      }
      setActiveTab("originality");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } finally { setRunning(false); setRunStep(""); }
  }

  const availableTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [];
  if (selectedAnalyses.has("originality") && verdict) availableTabs.push({ key: "originality", label: "Originality", icon: <Search className="w-4 h-4" /> });
  if (selectedAnalyses.has("effectiveness") && verdict?.effectiveness) availableTabs.push({ key: "effectiveness", label: "Effectiveness", icon: <Zap className="w-4 h-4" /> });
  if (selectedAnalyses.has("predictability") && verdict?.predictability) availableTabs.push({ key: "predictability", label: "Predictability", icon: <Bot className="w-4 h-4" /> });
  if (selectedAnalyses.has("benchmark") && verdict?.benchmark && verdict.benchmark.total_scored > 0) availableTabs.push({ key: "benchmark", label: "Benchmark", icon: <BarChart3 className="w-4 h-4" /> });
  if (selectedAnalyses.has("ideas") && ideateIdeas && ideateIdeas.length > 0) availableTabs.push({ key: "ideas", label: "Ideas", icon: <Sparkles className="w-4 h-4" /> });

  const hasResults = availableTabs.length > 0;
  const verdictStyle = verdict ? (
    verdict.overall_score >= 80 ? { bg: "from-green-500/5 to-transparent", border: "border-green-500/20" }
    : verdict.overall_score >= 60 ? { bg: "from-emerald-500/5 to-transparent", border: "border-emerald-500/20" }
    : verdict.overall_score >= 40 ? { bg: "from-amber-500/5 to-transparent", border: "border-amber-500/20" }
    : { bg: "from-red-500/5 to-transparent", border: "border-red-500/20" }
  ) : null;

  const inputClass = "w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 text-[var(--foreground)] placeholder-[var(--text-muted)] transition-all text-sm";
  const selectClass = "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-8">
      {/* ===== TWO-COLUMN LAYOUT: UPLOAD LEFT, ANALYSIS RIGHT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT: Campaign Form */}
        <div className="space-y-4">
          <form onSubmit={handleUpload} className="card-primary rounded-xl p-5 space-y-4">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Campaign Details</p>

            <div>
              <label className="block text-xs font-medium mb-1.5">Headline <span className="text-[var(--accent)]">*</span></label>
              <div className="flex gap-2 items-center">
                <input type="text" required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Your ad headline" className={`${inputClass} flex-1`} />
                <VoiceErrorBoundary><VoiceInput onTranscript={(t) => setForm((f) => ({ ...f, headline: t }))} /></VoiceErrorBoundary>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Body Copy</label>
              <textarea value={form.body_copy} onChange={(e) => setForm({ ...form, body_copy: e.target.value })} placeholder="Ad body copy" rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Script <span className="text-[10px] text-[var(--text-muted)]">(video/radio)</span></label>
              <textarea value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="Full script" rows={2} className={`${inputClass} resize-none`} />
            </div>

            <div className="grid grid-cols-3 gap-3">
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
                <label className="block text-xs font-medium mb-1.5">Media</label>
                <select value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })} className={selectClass}>
                  {["digital", "print", "video", "radio", "social", "outdoor"].map((v) => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Language</label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={selectClass}>
                  {["en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ar", "hi"].map((v) => (
                    <option key={v} value={v}>{v.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brief */}
            <div className="border-t border-[var(--border)] pt-4 space-y-3">
              <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Client Brief <span className="normal-case tracking-normal">(optional)</span></p>
              <div className="flex gap-2 items-start">
                <textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="What was the agency asked to do?" rows={2} className={`${inputClass} resize-none flex-1`} />
                <VoiceErrorBoundary><VoiceInput onTranscript={(t) => setForm((f) => ({ ...f, brief: t }))} className="mt-0.5" /></VoiceErrorBoundary>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} placeholder="Target audience" className={inputClass} />
                <input type="text" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Campaign objective" className={inputClass} />
              </div>
            </div>

            <button type="submit" disabled={uploading || !!campaignId}
              className="w-full btn-purple py-2.5 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : campaignId ? <><CheckCircle className="w-4 h-4" /> Ready</> : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
          </form>
        </div>

        {/* RIGHT: Upload + Analysis Selection */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <FileUploadZone onCampaignsExtracted={handleFileExtracted} onSelectCampaign={handleSelectCampaign} showScoreAll={false} />

          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Creative <span className="gradient-accent-text">Reality Check</span>
            </h1>
            <p className="text-[var(--text-muted)] mt-2 text-sm leading-relaxed">
              Upload your campaign, select your analyses, and get a comprehensive originality and effectiveness report.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Analyses</p>
            {ANALYSIS_OPTIONS.map((opt) => {
              const disabled = opt.requiresBrief && !hasBrief;
              const checked = selectedAnalyses.has(opt.id) && !disabled;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !disabled && toggleAnalysis(opt.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all text-sm ${
                    disabled ? "opacity-40 cursor-not-allowed bg-[var(--surface)]"
                    : checked ? "bg-[var(--accent)]/8 border border-[var(--accent)]/30" : "bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"}`}>
                    {checked && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className={checked ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>{opt.icon}</div>
                  <span className={checked ? "font-medium" : "text-[var(--text-muted)]"}>{opt.label}</span>
                  {disabled && <span className="text-[10px] text-[var(--accent)] ml-auto">needs brief</span>}
                </button>
              );
            })}
          </div>

          {campaignId && !hasResults && !running && (
            <button onClick={handleRunAnalysis} disabled={selectedAnalyses.size === 0}
              className="w-full btn-purple py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Run Analysis
            </button>
          )}

          {running && (
            <div className="card-elevated rounded-lg p-5 text-center space-y-3 animate-pulse-glow">
              <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-sm font-medium">{runStep || "Running..."}</p>
              <p className="text-xs text-[var(--text-muted)]">15-30 seconds</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== RESULTS ===== */}
      {hasResults && (
        <div ref={resultsRef} className="border-t border-[var(--border)] pt-8 space-y-6">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
            {availableTabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`} style={{ fontFamily: "var(--font-display)" }}>{tab.icon}{tab.label}</button>
            ))}
          </div>

          {/* ORIGINALITY */}
          {activeTab === "originality" && verdict && verdictStyle && (
            <div className="space-y-6">
              <div className={`card-elevated rounded-2xl p-8 bg-gradient-to-b ${verdictStyle.bg} border ${verdictStyle.border} relative overflow-hidden noise-bg`}>
                <div className="relative z-10 flex items-center gap-8">
                  <div className="relative animate-score-reveal">
                    <AnimatedGauge score={verdict.overall_score} size={150} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold font-mono" style={{ color: verdict.overall_score >= 80 ? "#16a34a" : verdict.overall_score >= 60 ? "#059669" : verdict.overall_score >= 40 ? "#ca8a04" : "#dc2626" }}>
                        <AnimatedNumber target={verdict.overall_score} />
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">score</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                      verdict.verdict.includes("HIGHLY ORIGINAL") ? "text-green-600 border-green-600/30 bg-green-600/10"
                      : verdict.verdict.includes("MOSTLY ORIGINAL") ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10"
                      : verdict.verdict.includes("SOMEWHAT") ? "text-amber-600 border-amber-600/30 bg-amber-600/10"
                      : "text-red-600 border-red-600/30 bg-red-600/10"
                    }`} style={{ fontFamily: "var(--font-display)" }}>{verdict.verdict}</div>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{verdict.summary}</p>
                    <VoiceErrorBoundary><VoiceVerdict result={verdict} /></VoiceErrorBoundary>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                <DimensionRadial score={verdict.dimensions.concept.score} label="Concept" icon={<Lightbulb className="w-3.5 h-3.5" />} weight="40%" delay={400} />
                <DimensionRadial score={verdict.dimensions.language.score} label="Language" icon={<Type className="w-3.5 h-3.5" />} weight="25%" delay={550} />
                <DimensionRadial score={verdict.dimensions.strategy.score} label="Strategy" icon={<Target className="w-3.5 h-3.5" />} weight="20%" delay={700} />
                <DimensionRadial score={verdict.dimensions.execution.score} label="Execution" icon={<Clapperboard className="w-3.5 h-3.5" />} weight="15%" delay={850} />
              </div>
              <div className="space-y-3">
                <DimensionDetail label="Concept" icon={<Lightbulb className="w-5 h-5" />} weight="40%" dimension={verdict.dimensions.concept} />
                <DimensionDetail label="Language" icon={<Type className="w-5 h-5" />} weight="25%" dimension={verdict.dimensions.language} />
                <DimensionDetail label="Strategy" icon={<Target className="w-5 h-5" />} weight="20%" dimension={verdict.dimensions.strategy} />
                <DimensionDetail label="Execution" icon={<Clapperboard className="w-5 h-5" />} weight="15%" dimension={verdict.dimensions.execution} />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] text-center opacity-50">{verdict.methodology}</p>
            </div>
          )}

          {/* EFFECTIVENESS */}
          {activeTab === "effectiveness" && verdict?.effectiveness && (
            <div className="card-elevated rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <AnimatedGauge score={verdict.effectiveness.overall} size={70} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-bold font-mono" style={{ color: verdict.effectiveness.overall >= 80 ? "#16a34a" : verdict.effectiveness.overall >= 60 ? "#059669" : verdict.effectiveness.overall >= 40 ? "#ca8a04" : "#dc2626" }}>{verdict.effectiveness.overall}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Effectiveness</p>
                    <p className="text-xs text-[var(--text-muted)]">Predicted performance</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  verdict.effectiveness.predicted_performance === "HIGH" ? "text-green-600 border-green-600/30 bg-green-600/10"
                  : verdict.effectiveness.predicted_performance === "ABOVE AVERAGE" ? "text-emerald-600 border-emerald-600/30 bg-emerald-600/10"
                  : verdict.effectiveness.predicted_performance === "AVERAGE" ? "text-amber-600 border-amber-600/30 bg-amber-600/10"
                  : "text-red-600 border-red-600/30 bg-red-600/10"
                }`}>{verdict.effectiveness.predicted_performance}</div>
              </div>
              <div className="space-y-2.5">
                {(["attention", "persuasion", "brand_recall", "emotional_resonance", "clarity", "call_to_action"] as const).map((key) => {
                  const labels: Record<string, { label: string; icon: React.ReactNode }> = { attention: { label: "Attention", icon: <Eye className="w-3 h-3" /> }, persuasion: { label: "Persuasion", icon: <TrendingUp className="w-3 h-3" /> }, brand_recall: { label: "Brand Recall", icon: <Brain className="w-3 h-3" /> }, emotional_resonance: { label: "Emotion", icon: <Heart className="w-3 h-3" /> }, clarity: { label: "Clarity", icon: <MessageSquare className="w-3 h-3" /> }, call_to_action: { label: "CTA", icon: <MousePointerClick className="w-3 h-3" /> } };
                  const dim = verdict.effectiveness!.dimensions[key];
                  const c = dim.score >= 80 ? "#16a34a" : dim.score >= 60 ? "#059669" : dim.score >= 40 ? "#ca8a04" : "#dc2626";
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-24 shrink-0 text-[var(--text-muted)]">{labels[key].icon}<span className="text-xs">{labels[key].label}</span></div>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: c, transition: "width 1s" }} />
                      </div>
                      <span className="text-xs font-mono font-bold w-6 text-right" style={{ color: c }}>{dim.score}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Techniques Used</p><div className="flex flex-wrap gap-1">{verdict.effectiveness.copywriting_techniques_used.map((t, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[10px]">{t}</span>)}</div></div>
                <div><p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Missing</p><div className="flex flex-wrap gap-1">{verdict.effectiveness.copywriting_techniques_missing.map((t, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px]">{t}</span>)}</div></div>
              </div>
            </div>
          )}

          {/* PREDICTABILITY */}
          {activeTab === "predictability" && verdict?.predictability && (
            !verdict.predictability.brief_provided ? (
              <div className="card-primary rounded-xl p-6"><p className="text-sm text-[var(--text-muted)]">No brief provided. Re-submit with the original client brief to check if AI could arrive at the same idea.</p></div>
            ) : (
              <div className={`card-elevated rounded-xl p-6 space-y-4 ${verdict.predictability.is_predictable ? "border-red-500/20" : "border-green-500/20"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    {verdict.predictability.is_predictable ? (
                      <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-500" /><span className="font-semibold text-red-600">AI predicted this idea</span></div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-semibold text-green-600">Beyond AI prediction</span></div>
                    )}
                    <p className="text-sm text-[var(--text-muted)]">{verdict.predictability.similarity_explanation}</p>
                  </div>
                  {verdict.predictability.penalty !== 0 && <div className="text-right shrink-0 ml-4"><p className="text-2xl font-bold font-mono text-red-500">{verdict.predictability.penalty}</p><p className="text-[10px] text-[var(--text-muted)]">penalty</p></div>}
                </div>
                {verdict.predictability.ideas.length > 0 && <PredictabilitySpectrum ideas={verdict.predictability.ideas} matchIndex={verdict.predictability.closest_match_index} />}
              </div>
            )
          )}

          {/* BENCHMARK */}
          {activeTab === "benchmark" && verdict?.benchmark && verdict.benchmark.total_scored > 0 && (
            <BenchmarkCard benchmark={verdict.benchmark} score={verdict.overall_score} />
          )}

          {/* IDEAS */}
          {activeTab === "ideas" && ideateIdeas && ideateIdeas.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-[10px] text-center">
                <div className="bg-red-500/10 text-red-600 rounded py-1">1-5: Obvious</div>
                <div className="bg-amber-500/10 text-amber-600 rounded py-1">6-10: Expected</div>
                <div className="bg-[var(--surface-2)] text-[var(--text-muted)] rounded py-1">11-15: Creative</div>
                <div className="bg-green-500/10 text-green-600 rounded py-1">16-20: Surprising</div>
              </div>
              {ideateIdeas.map((idea, i) => (
                <div key={i} className={`rounded-lg p-3 text-sm flex items-start gap-3 ${
                  i < 5 ? "bg-red-500/5 border border-red-500/10" : i < 10 ? "bg-amber-500/5 border border-amber-500/10" : i < 15 ? "bg-[var(--surface-2)] border border-[var(--border)]" : "bg-green-500/5 border border-green-500/10"
                }`}>
                  <span className={`font-mono text-[10px] mt-0.5 shrink-0 w-5 font-bold ${i < 5 ? "text-red-500" : i < 10 ? "text-amber-500" : i < 15 ? "text-[var(--text-muted)]" : "text-green-500"}`}>#{i + 1}</span>
                  <div><p className="font-medium text-sm">&ldquo;{idea.headline}&rdquo;</p><p className="text-xs text-[var(--text-muted)] mt-0.5">{idea.concept}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
