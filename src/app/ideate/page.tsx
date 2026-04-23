"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Clock } from "lucide-react";

interface CampaignIdea {
  headline: string;
  concept: string;
  tone: string;
  media_approach: string;
}

interface Ideation {
  id: number;
  brief: {
    product: string;
    industry: string;
    target_audience: string;
    objective: string;
    media_type: string;
    tone?: string;
    constraints?: string;
  };
  ideas: CampaignIdea[];
  created_at: string;
}

export default function IdeatePage() {
  const [form, setForm] = useState({
    product: "",
    industry: "",
    target_audience: "",
    objective: "",
    media_type: "digital",
    tone: "",
    constraints: "",
  });
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);
  const [pastIdeations, setPastIdeations] = useState<Ideation[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch("/api/ideations")
      .then((res) => res.json())
      .then((data) => setPastIdeations(data.ideations || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ideate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setIdeas(data.ideas || []);
    setLoading(false);

    // Refresh history
    fetch("/api/ideations")
      .then((res) => res.json())
      .then((data) => setPastIdeations(data.ideations || []))
      .catch(() => {});
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ideate</h1>
        <p className="text-[var(--text-muted)] mt-2">
          Generate 20 campaign ideas from your brief — ordered from most obvious to most creative.
          Use this to brainstorm, or to see if your agency&apos;s idea is something AI would come up with.
        </p>
      </div>

      {/* Past Ideations */}
      {!loadingHistory && pastIdeations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Past Ideations</h2>
          </div>
          <div className="space-y-2">
            {pastIdeations.map((ideation) => (
              <div
                key={ideation.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedId(expandedId === ideation.id ? null : ideation.id)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {ideation.brief.product} — {ideation.brief.objective}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {ideation.brief.industry} / {ideation.brief.media_type} / {ideation.brief.target_audience}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-[var(--text-muted)] opacity-70">{formatDate(ideation.created_at)}</span>
                    {expandedId === ideation.id ? (
                      <ChevronUp className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>

                {expandedId === ideation.id && (
                  <div className="border-t border-[var(--border)] px-4 py-4 space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-xs text-center mb-3">
                      <div className="bg-red-400/10 text-red-400 rounded-lg py-1">1-5: Obvious</div>
                      <div className="bg-amber-400/10 text-amber-400 rounded-lg py-1">6-10: Expected</div>
                      <div className="bg-[var(--surface-2)] text-[var(--text-muted)] rounded-lg py-1">11-15: Creative</div>
                      <div className="bg-green-400/10 text-green-400 rounded-lg py-1">16-20: Surprising</div>
                    </div>
                    {ideation.ideas.map((idea, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-3 text-sm ${
                          i < 5
                            ? "bg-red-400/5 border border-red-400/10"
                            : i < 10
                            ? "bg-amber-400/5 border border-amber-400/10"
                            : i < 15
                            ? "bg-[var(--surface-2)] border border-[var(--border)]"
                            : "bg-green-400/5 border border-green-400/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`font-mono text-xs mt-0.5 shrink-0 w-6 ${
                              i < 5
                                ? "text-red-400"
                                : i < 10
                                ? "text-amber-400"
                                : i < 15
                                ? "text-[var(--text-muted)]"
                                : "text-green-400"
                            }`}
                          >
                            #{i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-[var(--foreground)]">&ldquo;{idea.headline}&rdquo;</p>
                            <p className="text-[var(--text-muted)] mt-1">{idea.concept}</p>
                            <div className="flex gap-3 mt-2 text-xs text-[var(--text-muted)] opacity-70">
                              <span>{idea.tone}</span>
                              <span>·</span>
                              <span>{idea.media_approach}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Product / Brand *</label>
          <input
            type="text"
            required
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            placeholder="e.g. Nike running shoes, Tesla Model Y, Coca-Cola"
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Industry *</label>
            <select
              required
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--foreground)]"
            >
              <option value="">Select...</option>
              <option value="automotive">Automotive</option>
              <option value="tech">Technology</option>
              <option value="fmcg">FMCG</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="food">Food & Beverage</option>
              <option value="fashion">Fashion</option>
              <option value="travel">Travel</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Media Type *</label>
            <select
              required
              value={form.media_type}
              onChange={(e) => setForm({ ...form, media_type: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--foreground)]"
            >
              <option value="digital">Digital</option>
              <option value="print">Print</option>
              <option value="video">Video</option>
              <option value="radio">Radio</option>
              <option value="social">Social</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Target Audience *</label>
          <input
            type="text"
            required
            value={form.target_audience}
            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
            placeholder="e.g. Millennials aged 25-35, health-conscious parents"
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Campaign Objective *</label>
          <input
            type="text"
            required
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            placeholder="e.g. Launch awareness, rebrand perception, drive trial"
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Desired Tone</label>
            <input
              type="text"
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              placeholder="e.g. Bold, humorous, emotional"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Constraints</label>
            <input
              type="text"
              value={form.constraints}
              onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              placeholder="e.g. No humor, must include product shot"
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 text-zinc-950 py-3 rounded-lg font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating 20 ideas...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Ideas</>
          )}
        </button>
      </form>

      {ideas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">20 Campaign Ideas</h2>
            <p className="text-xs text-[var(--text-muted)] opacity-70">Most obvious → Most creative</p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs text-center mb-2">
            <div className="bg-red-400/10 text-red-400 rounded-lg py-1">1-5: Obvious</div>
            <div className="bg-amber-400/10 text-amber-400 rounded-lg py-1">6-10: Expected</div>
            <div className="bg-[var(--surface-2)] text-[var(--text-muted)] rounded-lg py-1">11-15: Creative</div>
            <div className="bg-green-400/10 text-green-400 rounded-lg py-1">16-20: Surprising</div>
          </div>

          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div
                key={i}
                className={`rounded-lg p-4 text-sm ${
                  i < 5
                    ? "bg-red-400/5 border border-red-400/10"
                    : i < 10
                    ? "bg-amber-400/5 border border-amber-400/10"
                    : i < 15
                    ? "bg-[var(--surface-2)] border border-[var(--border)]"
                    : "bg-green-400/5 border border-green-400/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`font-mono text-xs mt-0.5 shrink-0 w-6 ${
                    i < 5 ? "text-red-400" : i < 10 ? "text-amber-400" : i < 15 ? "text-[var(--text-muted)]" : "text-green-400"
                  }`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--foreground)]">&ldquo;{idea.headline}&rdquo;</p>
                    <p className="text-[var(--text-muted)] mt-1">{idea.concept}</p>
                    <div className="flex gap-3 mt-2 text-xs text-[var(--text-muted)] opacity-70">
                      <span>{idea.tone}</span>
                      <span>·</span>
                      <span>{idea.media_approach}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
