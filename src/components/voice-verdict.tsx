"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, Loader2, Square } from "lucide-react";

interface VoiceVerdictProps {
  result: { overall_score: number } & object;
}

type Status = "idle" | "loading" | "playing" | "error";

function getReactionLines(score: number): [string, string, string] {
  if (score >= 85) return [
    "Wow, that was really original — I hadn't thought about it that way.",
    "I'm actually sending this to someone.",
    "You don't see work like that very often.",
  ];
  if (score >= 70) return [
    "Yeah, I liked it — felt fresh.",
    "I'd probably remember that one.",
    "It's got something.",
  ];
  if (score >= 55) return [
    "It's fine, but I feel like I've seen it before.",
    "Didn't really stop me scrolling.",
    "Close, but not quite there.",
  ];
  if (score >= 40) return [
    "Every brand does this.",
    "I tuned out pretty fast.",
    "It just kind of washed over me.",
  ];
  return [
    "Oh no, not this again.",
    "I've seen this exact ad a hundred times.",
    "Nobody's going to talk about this.",
  ];
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div role="alert" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-medium shadow-lg">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100 text-white">✕</button>
    </div>
  );
}

export function VoiceVerdict({ result }: VoiceVerdictProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [toastMsg, setToastMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dismissToast = useCallback(() => setToastMsg(""), []);

  const lines = getReactionLines(result.overall_score);

  async function handlePlay() {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/voice/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("Voice synthesis failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setStatus("idle");
      audio.onerror = () => { setStatus("error"); setToastMsg("Playback error"); setTimeout(() => setStatus("idle"), 100); };
      await audio.play();
      setStatus("playing");
    } catch (err) {
      setToastMsg(err instanceof Error ? err.message : "Failed");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 100);
    }
  }

  return (
    <>
      <div className="space-y-3 mt-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">What people will say</p>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <p key={i} className="text-sm text-[var(--foreground)] opacity-80 leading-snug">
              "{line}"
            </p>
          ))}
        </div>
        <button
          onClick={handlePlay}
          disabled={status === "loading"}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border mt-2 ${
            status === "playing"
              ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30"
          } disabled:opacity-50`}
        >
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> :
           status === "playing" ? <Square className="w-4 h-4 fill-current" /> :
           <Volume2 className="w-4 h-4" />}
          {status === "loading" ? "Generating..." : status === "playing" ? "Stop" : "Hear Reactions"}
          {status === "playing" && (
            <span className="flex items-end gap-0.5 h-4 ml-1">
              {[0,1,2,3,4].map(i => (
                <span key={i} className="w-0.5 rounded-full bg-[var(--accent)]" style={{ height: "100%", animation: "waveBar 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
        </button>
      </div>
      {toastMsg && <Toast message={toastMsg} onDismiss={dismissToast} />}
      <style>{`@keyframes waveBar { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }`}</style>
    </>
  );
}
