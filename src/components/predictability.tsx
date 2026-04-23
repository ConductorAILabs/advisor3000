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
    <div className="space-y-3">
      <div className="relative h-10 rounded-lg overflow-hidden bg-gradient-to-r from-red-500/20 via-amber-500/20 via-50% to-green-500/20">
        <div className="absolute inset-0 flex">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`flex-1 border-r border-[var(--background)]/30 flex items-center justify-center text-[8px] font-mono ${
              matchIndex !== null && i === matchIndex - 1 ? "bg-[var(--accent)] text-white font-bold text-[10px]" : "text-[var(--text-muted)] opacity-40"
            }`}>{i + 1}</div>
          ))}
        </div>
        {matchIndex !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${((matchIndex - 0.5) / 20) * 100}%` }} />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-1">
        <span>Most predictable</span>
        <span>Most creative</span>
      </div>
      <button onClick={() => setOpen(!open)} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
        {open ? "Hide" : "View"} all 20 AI-generated ideas {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2">
          {ideas.map((idea, i) => (
            <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg text-sm ${
              matchIndex !== null && i === matchIndex - 1 ? "card-glow" : ""
            }`}>
              <span className={`font-mono text-[10px] mt-1 shrink-0 w-5 ${
                i < 5 ? "text-red-400" : i < 10 ? "text-amber-400" : i < 15 ? "text-[var(--text-muted)]" : "text-green-400"
              }`}>#{i + 1}</span>
              <div>
                <p className="font-medium text-sm">&ldquo;{idea.headline}&rdquo;</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{idea.concept}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
