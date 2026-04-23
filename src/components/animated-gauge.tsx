"use client";

import { useState, useEffect } from "react";

export function AnimatedGauge({ score, size = 180 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const targetOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#34d399" : score >= 40 ? "#eab308" : "#ef4444";
  const glowColor = score >= 80 ? "rgba(74,222,128,0.3)" : score >= 60 ? "rgba(52,211,153,0.3)" : score >= 40 ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)";

  useEffect(() => {
    const timer = setTimeout(() => setOffset(targetOffset), 200);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 20px ${glowColor})` }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth="10" fill="none" opacity="0.5" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
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
