"use client";

import { useState, useEffect } from "react";

export function AnimatedGauge({ score, size = 180 }: { score: number; size?: number }) {
  const strokeWidth = Math.max(8, Math.round(size / 18));
  const radius = (size - strokeWidth - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const targetOffset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" :
    score >= 60 ? "#10b981" :
    score >= 40 ? "#eab308" :
                  "#ef4444";
  const glowColor =
    score >= 80 ? "rgba(34,197,94,0.45)" :
    score >= 60 ? "rgba(16,185,129,0.38)" :
    score >= 40 ? "rgba(234,179,8,0.38)" :
                  "rgba(239,68,68,0.38)";
  const glowBlur = Math.round(size / 6);
  const tickCount = 40;

  useEffect(() => {
    const timer = setTimeout(() => setOffset(targetOffset), 200);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const center = size / 2;
  const tickOuter = radius + strokeWidth / 2 + 4;
  const tickInner = tickOuter - 3;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 ${glowBlur}px ${glowColor})` }}
      >
        {/* Outer tick ring — retro instrument feel */}
        {size >= 100 && (
          <g opacity="0.35">
            {Array.from({ length: tickCount }).map((_, i) => {
              const angle = (i / tickCount) * Math.PI * 2;
              const x1 = center + Math.cos(angle) * tickOuter;
              const y1 = center + Math.sin(angle) * tickOuter;
              const x2 = center + Math.cos(angle) * tickInner;
              const y2 = center + Math.sin(angle) * tickInner;
              const isMajor = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? "var(--text-muted)" : "var(--border)"}
                  strokeWidth={isMajor ? 1.25 : 0.75}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.45"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
    </div>
  );
}

export function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 50));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      setValue(current);
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <>{value}</>;
}
