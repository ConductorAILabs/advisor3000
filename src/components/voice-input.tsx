"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

type RecordingStatus = "idle" | "recording" | "transcribing" | "error";

/** Lightweight self-dismissing toast — no external library needed */
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-medium shadow-lg animate-fade-up"
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function VoiceInput({ onTranscript, className = "" }: VoiceInputProps) {
  // 3.2.1 — render null if MediaRecorder API not available
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [toastMsg, setToastMsg] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const dismissToast = useCallback(() => setToastMsg(""), []);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );
  }, []);

  if (!supported) return null;

  async function handleClick() {
    // 3.2.3 — clicking while recording stops it
    if (status === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }

    setToastMsg("");
    setStatus("recording");
    chunksRef.current = [];

    try {
      // 3.2.2 — request getUserMedia and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // 3.2.5 — transcribing state
        setStatus("transcribing");

        try {
          // 3.2.4 — send chunks to /api/voice/transcribe
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");

          const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { error?: string }).error || "Transcription failed");
          }
          const { text } = await res.json();
          // 3.2.6 — call onTranscript on success
          onTranscript(text);
          setStatus("idle");
        } catch (err) {
          // 3.2.7 — toast on error
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setToastMsg(msg);
          setStatus("error");
          setTimeout(() => setStatus("idle"), 100);
        }
      };

      recorder.start();
    } catch {
      // 3.2.7 — toast on mic access error
      setToastMsg("Microphone access denied");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 100);
    }
  }

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";

  return (
    <>
      <div className={`relative flex items-center gap-2 ${className}`}>
        {/* 3.2.3 — pulsing red dot while recording */}
        {isRecording && (
          <span
            className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={isTranscribing}
          title={isRecording ? "Stop recording" : "Record voice input"}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all border text-sm font-medium ${
            isRecording
              ? "bg-red-500/15 border-red-500/40 text-red-500"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30"
          } disabled:opacity-50`}
        >
          {isTranscribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {/* 3.2.3 — "Stop" label while recording */}
          {isRecording && <span className="text-xs">Stop</span>}
        </button>
      </div>

      {/* 3.2.7 — toast notification on error */}
      {toastMsg && <Toast message={toastMsg} onDismiss={dismissToast} />}
    </>
  );
}
