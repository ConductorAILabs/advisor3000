"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Scale,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  XCircle,
  ImagePlus,
  X,
} from "lucide-react";

interface PriorArt {
  what: string;
  who: string;
  when: string;
  source_url?: string;
}

interface ClaimEvidence {
  url: string;
  title: string;
  relevant_text: string;
  supports_or_refutes: "supports" | "refutes" | "contextual";
}

interface ClaimVerdict {
  claim: string;
  verdict:
    | "TRUE"
    | "MOSTLY TRUE"
    | "MISLEADING"
    | "UNVERIFIABLE"
    | "MOSTLY FALSE"
    | "FALSE";
  confidence: number;
  summary: string;
  prior_art: PriorArt[];
  evidence: ClaimEvidence[];
  recommendation: string;
}

interface ClaimsReport {
  overall_assessment: string;
  claims: ClaimVerdict[];
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    TRUE: {
      bg: "bg-green-400/10 border-green-400/30",
      text: "text-green-400",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    "MOSTLY TRUE": {
      bg: "bg-emerald-400/10 border-emerald-400/30",
      text: "text-emerald-400",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    MISLEADING: {
      bg: "bg-amber-400/10 border-amber-400/30",
      text: "text-amber-400",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    UNVERIFIABLE: {
      bg: "bg-zinc-400/10 border-zinc-400/30",
      text: "text-zinc-400",
      icon: <HelpCircle className="w-4 h-4" />,
    },
    "MOSTLY FALSE": {
      bg: "bg-orange-400/10 border-orange-400/30",
      text: "text-orange-400",
      icon: <XCircle className="w-4 h-4" />,
    },
    FALSE: {
      bg: "bg-red-400/10 border-red-400/30",
      text: "text-red-400",
      icon: <XCircle className="w-4 h-4" />,
    },
  };
  const c = config[verdict] || config.UNVERIFIABLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}
    >
      {c.icon} {verdict}
    </span>
  );
}

function ClaimCard({ claim }: { claim: ClaimVerdict }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--foreground)] mb-2">
              &ldquo;{claim.claim}&rdquo;
            </p>
            <p className="text-sm text-[var(--text-muted)]">{claim.summary}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <VerdictBadge verdict={claim.verdict} />
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-[var(--foreground)]">
                {claim.confidence}%
              </p>
              <p className="text-xs text-[var(--text-muted)] opacity-70">confidence</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)] pt-4">
          {claim.prior_art.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Prior Art
              </p>
              <div className="space-y-2">
                {claim.prior_art.map((pa, i) => (
                  <div
                    key={i}
                    className="bg-[var(--surface-2)] rounded-lg p-3 text-sm flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-[var(--foreground)]">
                        <span className="font-medium">{pa.who}</span> had{" "}
                        <span className="font-medium">{pa.what}</span>
                        {pa.when && (
                          <span className="text-[var(--text-muted)]"> ({pa.when})</span>
                        )}
                      </p>
                    </div>
                    {pa.source_url && (
                      <a
                        href={pa.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/70 hover:text-amber-400 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {claim.evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Evidence
              </p>
              <div className="space-y-2">
                {claim.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm border ${
                      ev.supports_or_refutes === "refutes"
                        ? "bg-red-400/5 border-red-400/10"
                        : ev.supports_or_refutes === "supports"
                          ? "bg-green-400/5 border-green-400/10"
                          : "bg-[var(--surface-2)] border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-[var(--text-muted)]">
                        {ev.title || "Source"}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs ${
                            ev.supports_or_refutes === "refutes"
                              ? "text-red-400"
                              : ev.supports_or_refutes === "supports"
                                ? "text-green-400"
                                : "text-[var(--text-muted)]"
                          }`}
                        >
                          {ev.supports_or_refutes}
                        </span>
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400/70 hover:text-amber-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs italic">
                      &ldquo;{ev.relevant_text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-400/5 border border-amber-400/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Suggested correction
            </p>
            <p className="text-sm text-[var(--foreground)]">{claim.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function ClaimsPage() {
  const [form, setForm] = useState({
    claims_text: "",
    claimant: "",
    context: "",
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ClaimsReport | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    if (file.size > 20 * 1024 * 1024) return; // 20MB limit
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Clipboard paste support
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageFile(file);
          break;
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleImageFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.claims_text && !imageFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("claims_text", form.claims_text);
    formData.append("claimant", form.claimant);
    formData.append("context", form.context);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const res = await fetch("/api/claims", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setReport(data);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Scale className="w-8 h-8 text-amber-400" /> Claims Prover
        </h1>
        <p className="text-[var(--text-muted)] mt-2">
          Paste a marketing claim and we&apos;ll fact-check it against the
          public record. We search for prior art, verify timelines, and flag
          misleading language.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Zone */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Screenshot / Image (optional)
          </label>
          {imagePreview ? (
            <div className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 z-10 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] rounded-full p-1.5 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="max-h-64 rounded-md mx-auto object-contain"
              />
              <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                {imageFile?.name} ({((imageFile?.size ?? 0) / 1024).toFixed(0)}{" "}
                KB)
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleImageFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                dragOver
                  ? "border-amber-400 bg-amber-400/5"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--surface-3)] hover:bg-[var(--surface)]"
              }`}
            >
              <ImagePlus
                className={`w-8 h-8 ${dragOver ? "text-amber-400" : "text-[var(--text-muted)]"}`}
              />
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  <span className="text-amber-400 font-medium">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-[var(--text-muted)] opacity-70 mt-1">
                  PNG, JPG, GIF or WebP. You can also paste a screenshot (Ctrl+V
                  / Cmd+V).
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Claim(s) to verify {!imageFile && "*"}
          </label>
          <textarea
            required={!imageFile}
            value={form.claims_text}
            onChange={(e) => setForm({ ...form, claims_text: e.target.value })}
            placeholder=""
            rows={5}
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)] resize-none"
          />
          {imageFile && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Claims will be extracted from the image automatically. Add text
              above to include additional claims.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Who made this claim?
            </label>
            <input
              type="text"
              value={form.claimant}
              onChange={(e) => setForm({ ...form, claimant: e.target.value })}
              placeholder=""
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Additional context
            </label>
            <input
              type="text"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder=""
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-amber-400/50 text-[var(--foreground)] placeholder-[var(--text-muted)]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!form.claims_text && !imageFile)}
          className="w-full bg-amber-400 text-zinc-950 py-3 rounded-lg font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Searching evidence
              and analyzing claims...
            </>
          ) : (
            <>
              <Scale className="w-4 h-4" /> Check Claims
            </>
          )}
        </button>
      </form>

      {report && (
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Overall Assessment
            </h2>
            <p className="text-[var(--foreground)] leading-relaxed">
              {report.overall_assessment}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {report.claims.length} Claim
              {report.claims.length !== 1 ? "s" : ""} Analyzed
            </h2>
            {report.claims.map((claim, i) => (
              <ClaimCard key={i} claim={claim} />
            ))}
          </div>

          <div className="text-xs text-[var(--text-muted)] opacity-70 border-t border-[var(--border)] pt-4 space-y-1">
            <p>
              Claims Prover searches publicly available web content, press
              coverage, and historical records. It does not have access to
              private communications, internal documents, or unpublished
              materials. Verdicts reflect what can be verified from the public
              record.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
