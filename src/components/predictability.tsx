"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface CampaignIdea {
  headline: string;
  concept: string;
  tone: string;
  media_approach: string;
}

export function PredictabilitySpectrum({ ideas, matchIndex }: { ideas: CampaignIdea[]; matchIndex: number | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="section-eyebrow">AI idea spectrum</p>
        <div className="relative h-12 rounded-xl overflow-hidden bg-gradient-to-r from-red-500/15 via-amber-500/15 to-green-500/15 border border-[var(--border)]">
          <div className="absolute inset-0 flex">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 border-r border-[var(--background)]/40 flex items-center justify-center text-[9px] font-mono transition-all ${
                  matchIndex !== null && i === matchIndex - 1
                    ? "bg-[var(--accent)] text-white font-bold text-[11px] shadow-lg"
                    : "text-[var(--text-muted)] opacity-45"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          {matchIndex !== null && (
            <div
              className="absolute -top-1.5 w-3 h-3 rounded-full bg-[var(--accent)] -translate-x-1/2 shadow-md"
              style={{ left: `${((matchIndex - 0.5) / 20) * 100}%`, boxShadow: "0 0 10px var(--accent)" }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] uppercase tracking-[0.18em] px-1 font-medium">
          <span>Most predictable</span>
          <span>Most creative</span>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
      >
        {open ? "Hide" : "View"} all 20 AI-generated ideas
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {ideas.map((idea, i) => {
            const tier =
              i < 5 ? { text: "text-red-500", bg: "bg-red-500/5", border: "border-red-500/15" }
              : i < 10 ? { text: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/15" }
              : i < 15 ? { text: "text-[var(--text-muted)]", bg: "bg-[var(--surface-2)]", border: "border-[var(--border)]" }
              :          { text: "text-green-500", bg: "bg-green-500/5", border: "border-green-500/15" };
            const isMatch = matchIndex !== null && i === matchIndex - 1;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm border transition-all ${
                  isMatch ? "card-glow border-[var(--accent)]/40" : `${tier.bg} ${tier.border}`
                }`}
              >
                <span className={`font-mono text-[11px] font-bold mt-0.5 shrink-0 w-6 ${tier.text}`}>
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug">&ldquo;{idea.headline}&rdquo;</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{idea.concept}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
