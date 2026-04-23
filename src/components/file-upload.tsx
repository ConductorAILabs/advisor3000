"use client";

import { useState, useRef } from "react";
import { Loader2, Sparkles, AlertTriangle, FileUp, File, Image, X, Gavel } from "lucide-react";

export interface ExtractedCampaign {
  headline: string;
  body_copy?: string;
  script?: string;
  industry: string;
  media_type: string;
  language: string;
  visual_description?: string;
  confidence: number;
  page_number?: number;
}

export interface FileExtractionResult {
  campaigns: ExtractedCampaign[];
  raw_text?: string;
  total_pages?: number;
  file_type: string;
}

const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp,.pptx";
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
const MAX_SIZE = 20 * 1024 * 1024;

function fileIcon(type: string) {
  if (type === "application/pdf") return <File className="w-5 h-5" />;
  if (type.startsWith("image/")) return <Image className="w-5 h-5" />;
  return <FileUp className="w-5 h-5" />;
}

function confidenceColor(c: number) {
  if (c >= 80) return "text-green-400";
  if (c >= 50) return "text-amber-400";
  return "text-red-400";
}

export function FileUploadZone({ onCampaignsExtracted, onSelectCampaign, showScoreAll = true }: {
  onCampaignsExtracted: (result: FileExtractionResult) => void;
  onSelectCampaign: (campaign: ExtractedCampaign) => void;
  showScoreAll?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<FileExtractionResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.size > MAX_SIZE) return "File too large. Maximum size is 20MB.";
    if (!ACCEPTED_MIME.includes(file.type)) return "Unsupported file type. Use PDF, PNG, JPG, WEBP, or PPTX.";
    return null;
  }

  async function processFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    setFileName(file.name);
    setUploading(true);
    setExtractionResult(null);
    setSelectedIndex(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract-file", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Extraction failed");
      }
      const result: FileExtractionResult = await res.json();
      setExtractionResult(result);
      onCampaignsExtracted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract campaigns");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleSelect(campaign: ExtractedCampaign, idx: number) {
    setSelectedIndex(idx);
    onSelectCampaign(campaign);
  }

  function handleClear() {
    setExtractionResult(null);
    setFileName(null);
    setError(null);
    setSelectedIndex(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
          dragging
            ? "border-[var(--accent)] bg-[var(--accent-glow)]"
            : "border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--surface)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>Extracting campaigns...</p>
            <p className="text-xs text-[var(--text-muted)]">Analyzing {fileName} with Claude Vision</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileUp className="w-8 h-8 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>
                Drop a file or <span className="text-[var(--accent)]">browse</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                PDF, PNG, JPG, WEBP, PPTX &mdash; up to 20MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm px-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted campaigns */}
      {extractionResult && extractionResult.campaigns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>
                {extractionResult.campaigns.length} campaign{extractionResult.campaigns.length !== 1 ? "s" : ""} extracted
              </h3>
              {extractionResult.total_pages && (
                <span className="text-xs text-[var(--text-muted)]">
                  from {extractionResult.total_pages} page{extractionResult.total_pages !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button onClick={handleClear} className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          <div className="grid gap-3">
            {extractionResult.campaigns.map((campaign, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(campaign, idx)}
                className={`w-full text-left rounded-xl p-4 transition-all duration-200 ${
                  selectedIndex === idx ? "card-glow" : "card-primary hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="text-[var(--text-muted)] mt-0.5 shrink-0">
                      {fileIcon(extractionResult.file_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" style={{ fontFamily: "var(--font-display)" }}>
                        &ldquo;{campaign.headline}&rdquo;
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                          {campaign.industry}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                          {campaign.media_type}
                        </span>
                        {campaign.page_number && (
                          <span className="text-[10px] uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                            p.{campaign.page_number}
                          </span>
                        )}
                      </div>
                      {campaign.visual_description && (
                        <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                          {campaign.visual_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-mono font-bold ${confidenceColor(campaign.confidence)}`}>
                      {campaign.confidence}%
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">confidence</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Or enter manually</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
        </div>
      )}

      {/* Show divider when no extraction result but file was cleared or never uploaded */}
      {!extractionResult && !uploading && (
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Or enter manually</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
      )}
    </div>
  );
}
