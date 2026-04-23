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
  const [errorMsg, setErrorMsg] = useState("");
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
    setErrorMsg("");
    try {
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.status === 401) {
        window.location.href = `/signup?next=${encodeURIComponent("/analyze")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setCampaignId(data.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function handleRunAnalysis() {
    if (!campaignId || selectedAnalyses.size === 0) return;
    setRunning(true); setVerdict(null); setIdeateIdeas(null); setErrorMsg("");
    try {
      const needsJudge = selectedAnalyses.has("originality") || selectedAnalyses.has("effectiveness") || selectedAnalyses.has("benchmark") || selectedAnalyses.has("predictability");
      if (needsJudge) {
        setRunStep("Queuing analysis...");
        const enqRes = await fetch("/api/judge/enqueue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaignId }) });
        if (enqRes.status === 401) {
          window.location.href = `/signup?next=${encodeURIComponent("/analyze")}`;
          return;
        }
        const enqData = await enqRes.json();
        if (!enqRes.ok) throw new Error(enqData.error || "Failed to queue analysis");
        const { job_id } = enqData;

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
        if (!res.ok) throw new Error(data.error || "Idea generation failed");
        setIdeateIdeas(data.ideas || []);
      }
      setActiveTab("originality");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed");
    } finally { setRunning(false); setRunStep(""); }
  }

  const availableTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [];
  if (selectedAnalyses.has("originality") && verdict) availableTabs.push({ key: "originality", label: "Originality", icon: <Search className="w-4 h-4" /> });
  if (selectedAnalyses.has("effectiveness") && verdict?.effectiveness) availableTabs.push({ key: "effectiveness", label: "Effectiveness", icon: <Zap className="w-4 h-4" /> });
  if (selectedAnalyses.has("predictability") && verdict?.predictability) availableTabs.push({ key: "predictability", label: "Predictability", icon: <Bot className="w-4 h-4" /> });
  if (selectedAnalyses.has("benchmark") && verdict?.benchmark && verdict.benchmark.total_scored > 0) availableTabs.push({ key: "benchmark", label: "Benchmark", icon: <BarChart3 className="w-4 h-4" /> });
  if (selectedAnalyses.has("ideas") && ideateIdeas && ideateIdeas.length > 0) availableTabs.push({ key: "ideas", label: "Ideas", icon: <Sparkles className="w-4 h-4" /> });

  const hasResults = availableTabs.length > 0;

  function tier(score: number): "high" | "good" | "mid" | "low" {
    if (score >= 80) return "high";
    if (score >= 60) return "good";
    if (score >= 40) return "mid";
    return "low";
  }
  function tierHex(score: number): string {
    const t = tier(score);
    return t === "high" ? "#16a34a" : t === "good" ? "#059669" : t === "mid" ? "#ca8a04" : "#dc2626";
  }
  const verdictStyle = verdict ? (
    (() => {
      const t = tier(verdict.overall_score);
      return {
        glow: `score-glow-${t}`,
        badge: `tier-badge-${t}`,
      };
    })()
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
            <fieldset disabled={uploading || !!campaignId} className="space-y-4 contents">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--text-muted)] font-medium">Campaign Details</p>

            <div>
              <label className="block text-xs font-medium mb-1.5">Headline <span className="text-[var(--accent)]">*</span></label>
              <input type="text" required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Your ad headline" className={inputClass} />
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
              <textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="What was the agency asked to do?" rows={2} className={`${inputClass} resize-none`} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} placeholder="Target audience" className={inputClass} />
                <input type="text" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Campaign objective" className={inputClass} />
              </div>
            </div>

            <button type="submit" disabled={uploading || !!campaignId}
              className="w-full btn-purple py-2.5 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : campaignId ? <><CheckCircle className="w-4 h-4" /> Ready</> : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
            </fieldset>
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

          {errorMsg && !running && (
            <div className="rounded-lg p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
                <button onClick={() => setErrorMsg("")} className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] mt-1">Dismiss</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RESULTS ===== */}
      {hasResults && (
        <div ref={resultsRef} className="border-t border-[var(--border)] pt-10 space-y-8">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto sticky top-[80px] bg-[var(--background)]/90 backdrop-blur-md z-20 -mx-4 px-4 sm:mx-0 sm:px-0">
            {availableTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold tracking-tight whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ORIGINALITY */}
          {activeTab === "originality" && verdict && verdictStyle && (
            <div className="space-y-10">
              {/* HERO VERDICT BLOCK */}
              <div
                className={`card-elevated verdict-hero corner-ticks rounded-3xl px-6 sm:px-10 py-10 sm:py-14 relative noise-bg ${verdictStyle.glow}`}
              >
                <div className="relative z-10 flex flex-col items-center text-center gap-6 sm:gap-8">
                  {/* Eyebrow readout */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <span className="readout">
                      <span className="readout-dot" />
                      Ad-Visor 3000
                    </span>
                    {typeof verdict.total_ads_compared === "number" && verdict.total_ads_compared > 0 && (
                      <span className="readout">
                        {verdict.total_ads_compared} ads compared
                      </span>
                    )}
                  </div>

                  {/* The Gauge — big and centered */}
                  <div className="relative animate-score-reveal">
                    <AnimatedGauge score={verdict.overall_score} size={260} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span
                        className="score-display text-7xl sm:text-8xl font-black"
                        style={{ color: tierHex(verdict.overall_score) }}
                      >
                        <AnimatedNumber target={verdict.overall_score} />
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1 font-semibold">
                        Originality Score
                      </span>
                    </div>
                  </div>

                  {/* Verdict badge */}
                  <div
                    className={`verdict-badge ${verdictStyle.badge} animate-verdict-slide`}
                    style={{ animationDelay: "400ms", animationFillMode: "both" }}
                  >
                    {verdict.verdict}
                  </div>

                  {/* Summary */}
                  <p
                    className="text-base sm:text-lg text-[var(--foreground)]/85 leading-relaxed max-w-2xl animate-fade-up opacity-0"
                    style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
                  >
                    {verdict.summary}
                  </p>

                  {/* Voice reactions */}
                  <div className="w-full max-w-2xl">
                    <VoiceErrorBoundary>
                      <VoiceVerdict result={verdict} />
                    </VoiceErrorBoundary>
                  </div>
                </div>
              </div>

              {/* DIMENSION RADIALS */}
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="section-eyebrow">Dimensional breakdown</p>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
                    WEIGHTED COMPOSITE
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <DimensionRadial score={verdict.dimensions.concept.score} label="Concept" icon={<Lightbulb className="w-3.5 h-3.5" />} weight="40%" delay={400} />
                  <DimensionRadial score={verdict.dimensions.language.score} label="Language" icon={<Type className="w-3.5 h-3.5" />} weight="25%" delay={550} />
                  <DimensionRadial score={verdict.dimensions.strategy.score} label="Strategy" icon={<Target className="w-3.5 h-3.5" />} weight="20%" delay={700} />
                  <DimensionRadial score={verdict.dimensions.execution.score} label="Execution" icon={<Clapperboard className="w-3.5 h-3.5" />} weight="15%" delay={850} />
                </div>
              </div>

              {/* DIMENSION DETAILS */}
              <div className="space-y-4">
                <p className="section-eyebrow">Evidence &amp; analysis</p>
                <div className="space-y-3">
                  <DimensionDetail label="Concept" icon={<Lightbulb className="w-5 h-5" />} weight="40%" dimension={verdict.dimensions.concept} />
                  <DimensionDetail label="Language" icon={<Type className="w-5 h-5" />} weight="25%" dimension={verdict.dimensions.language} />
                  <DimensionDetail label="Strategy" icon={<Target className="w-5 h-5" />} weight="20%" dimension={verdict.dimensions.strategy} />
                  <DimensionDetail label="Execution" icon={<Clapperboard className="w-5 h-5" />} weight="15%" dimension={verdict.dimensions.execution} />
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] text-center opacity-50 pt-2">
                {verdict.methodology}
              </p>
            </div>
          )}

          {/* EFFECTIVENESS */}
          {activeTab === "effectiveness" && verdict?.effectiveness && (
            <div className="card-elevated rounded-2xl p-7 space-y-7">
              {/* Header: score + predicted performance */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5">
                  <div className="relative animate-score-reveal">
                    <AnimatedGauge score={verdict.effectiveness.overall} size={96} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="score-display text-2xl font-bold font-mono"
                        style={{ color: tierHex(verdict.effectiveness.overall) }}
                      >
                        <AnimatedNumber target={verdict.effectiveness.overall} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="section-eyebrow mb-1">Effectiveness</p>
                    <p className="text-lg font-semibold tracking-tight">Predicted performance</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Composite of six behavioral signals
                    </p>
                  </div>
                </div>
                <div
                  className={`verdict-badge ${
                    verdict.effectiveness.predicted_performance === "HIGH" ? "tier-badge-high"
                    : verdict.effectiveness.predicted_performance === "ABOVE AVERAGE" ? "tier-badge-good"
                    : verdict.effectiveness.predicted_performance === "AVERAGE" ? "tier-badge-mid"
                    : "tier-badge-low"
                  }`}
                >
                  {verdict.effectiveness.predicted_performance}
                </div>
              </div>

              {/* Metric bars */}
              <div className="space-y-4">
                <p className="section-eyebrow">Behavioral signals</p>
                <div className="space-y-3.5">
                  {(["attention", "persuasion", "brand_recall", "emotional_resonance", "clarity", "call_to_action"] as const).map((key, i) => {
                    const labels: Record<string, { label: string; icon: React.ReactNode }> = {
                      attention: { label: "Attention", icon: <Eye className="w-3.5 h-3.5" /> },
                      persuasion: { label: "Persuasion", icon: <TrendingUp className="w-3.5 h-3.5" /> },
                      brand_recall: { label: "Brand Recall", icon: <Brain className="w-3.5 h-3.5" /> },
                      emotional_resonance: { label: "Emotion", icon: <Heart className="w-3.5 h-3.5" /> },
                      clarity: { label: "Clarity", icon: <MessageSquare className="w-3.5 h-3.5" /> },
                      call_to_action: { label: "CTA", icon: <MousePointerClick className="w-3.5 h-3.5" /> },
                    };
                    const dim = verdict.effectiveness!.dimensions[key];
                    const c = tierHex(dim.score);
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[120px_1fr_48px] sm:grid-cols-[150px_1fr_56px] items-center gap-3 animate-fade-up opacity-0"
                        style={{ animationDelay: `${120 * i}ms`, animationFillMode: "forwards" }}
                      >
                        <div className="flex items-center gap-2 text-[var(--foreground)]/80">
                          <span style={{ color: c }}>{labels[key].icon}</span>
                          <span className="text-sm font-medium">{labels[key].label}</span>
                        </div>
                        <div className="metric-bar-track">
                          <div
                            className="metric-bar-fill"
                            style={{ width: `${dim.score}%`, backgroundColor: c, color: c }}
                          />
                        </div>
                        <span
                          className="score-display text-base font-mono font-bold text-right tabular-nums"
                          style={{ color: c }}
                        >
                          {dim.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Techniques grid */}
              <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-[var(--border)]">
                <div className="space-y-2">
                  <p className="section-eyebrow">Techniques used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {verdict.effectiveness.copywriting_techniques_used.length === 0 ? (
                      <span className="text-xs text-[var(--text-muted)] italic">None detected</span>
                    ) : (
                      verdict.effectiveness.copywriting_techniques_used.map((t, i) => (
                        <span key={i} className="technique-chip tier-badge-high">{t}</span>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="section-eyebrow">Missing opportunities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {verdict.effectiveness.copywriting_techniques_missing.length === 0 ? (
                      <span className="text-xs text-[var(--text-muted)] italic">Nothing critical missing</span>
                    ) : (
                      verdict.effectiveness.copywriting_techniques_missing.map((t, i) => (
                        <span key={i} className="technique-chip tier-badge-mid">{t}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREDICTABILITY */}
          {activeTab === "predictability" && verdict?.predictability && (
            !verdict.predictability.brief_provided ? (
              <div className="card-primary rounded-2xl p-8 text-center">
                <Bot className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
                  No brief provided. Re-submit with the original client brief to check if AI could arrive at the same idea.
                </p>
              </div>
            ) : (
              <div
                className={`card-elevated rounded-2xl p-7 space-y-6 ${
                  verdict.predictability.is_predictable ? "border-red-500/25" : "border-green-500/25"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-[220px]">
                    {verdict.predictability.is_predictable ? (
                      <div className="verdict-badge tier-badge-low">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        AI predicted this idea
                      </div>
                    ) : (
                      <div className="verdict-badge tier-badge-high">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Beyond AI prediction
                      </div>
                    )}
                    <p className="text-sm text-[var(--foreground)]/85 leading-relaxed mt-3">
                      {verdict.predictability.similarity_explanation}
                    </p>
                  </div>
                  {verdict.predictability.penalty !== 0 && (
                    <div className="text-right shrink-0 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="score-display text-3xl font-bold font-mono text-red-500">
                        {verdict.predictability.penalty}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-0.5 font-semibold">
                        Score penalty
                      </p>
                    </div>
                  )}
                </div>
                {verdict.predictability.ideas.length > 0 && (
                  <PredictabilitySpectrum
                    ideas={verdict.predictability.ideas}
                    matchIndex={verdict.predictability.closest_match_index}
                  />
                )}
              </div>
            )
          )}

          {/* BENCHMARK */}
          {activeTab === "benchmark" && verdict?.benchmark && verdict.benchmark.total_scored > 0 && (
            <BenchmarkCard benchmark={verdict.benchmark} score={verdict.overall_score} />
          )}

          {/* IDEAS */}
          {activeTab === "ideas" && ideateIdeas && ideateIdeas.length > 0 && (
            <div className="space-y-5">
              <div>
                <p className="section-eyebrow mb-3">Predictability spectrum</p>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-center font-mono tracking-wider">
                  <div className="bg-red-500/10 text-red-600 rounded-lg py-1.5 border border-red-500/15">1-5 OBVIOUS</div>
                  <div className="bg-amber-500/10 text-amber-600 rounded-lg py-1.5 border border-amber-500/15">6-10 EXPECTED</div>
                  <div className="bg-[var(--surface-2)] text-[var(--text-muted)] rounded-lg py-1.5 border border-[var(--border)]">11-15 CREATIVE</div>
                  <div className="bg-green-500/10 text-green-600 rounded-lg py-1.5 border border-green-500/15">16-20 SURPRISING</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {ideateIdeas.map((idea, i) => {
                  const tier =
                    i < 5 ? { text: "text-red-500", bg: "bg-red-500/5", border: "border-red-500/15" }
                    : i < 10 ? { text: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/15" }
                    : i < 15 ? { text: "text-[var(--text-muted)]", bg: "bg-[var(--surface-2)]", border: "border-[var(--border)]" }
                    :          { text: "text-green-500", bg: "bg-green-500/5", border: "border-green-500/15" };
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3.5 text-sm flex items-start gap-3 border transition-all hover:translate-x-0.5 ${tier.bg} ${tier.border}`}
                    >
                      <span className={`font-mono text-xs mt-0.5 shrink-0 w-7 font-bold ${tier.text}`}>
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug">&ldquo;{idea.headline}&rdquo;</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{idea.concept}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
