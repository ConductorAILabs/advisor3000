"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const PLAYBACK_SPEED = 0.35; // forward speed (fractional = slower)
const REVERSE_STEP = 0.033;  // seconds to step back per ~60fps frame while reversing

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      if (!video) return;
      if (directionRef.current === -1) {
        // Manually step backwards
        video.currentTime = Math.max(0, video.currentTime - REVERSE_STEP * PLAYBACK_SPEED);
        if (video.currentTime <= 0.05) {
          directionRef.current = 1;
          video.playbackRate = PLAYBACK_SPEED;
          video.play();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function handleTimeUpdate() {
      if (!video) return;
      if (directionRef.current === 1 && video.duration && video.currentTime >= video.duration - 0.1) {
        directionRef.current = -1;
        video.pause();
      }
    }

    video.playbackRate = PLAYBACK_SPEED;
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.play().catch(() => {});
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  return (
    <>
      {/* Full-viewport video */}
      <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden="true">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Darker overlay for readability */}
        <div className="absolute inset-0 bg-black/65" />
      </div>

      {/* Centred content */}
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center text-center px-8 pointer-events-none">
        <div className="pointer-events-auto w-full px-8">
          <Image
            src="/advisor3000.png"
            alt="Advisor 3000"
            width={900}
            height={340}
            className="w-full max-w-3xl mx-auto mb-6 drop-shadow-2xl"
            priority
          />
          <h1
            className="text-white font-black uppercase leading-[0.9] mb-6 whitespace-nowrap"
            style={{ fontSize: "clamp(1rem, 3.5vw, 3.5rem)", letterSpacing: "-0.01em" }}
          >
            IS YOUR CREATIVE AGENCY<br />
            GIVING YOU SLOP?
          </h1>
          <p className="text-white/70 text-xl uppercase tracking-[0.15em] mb-10 font-medium">
            Use the Advisor 3000 to check the originality of your creative
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/analyze" className="btn-purple px-8 py-3 rounded-lg font-bold text-base flex items-center gap-2">
              Analyze My Ad <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/claims" className="px-8 py-3 rounded-lg font-bold text-base flex items-center gap-2 border border-white/25 text-white hover:bg-white/10 transition-all">
              Check a Claim
            </Link>
          </div>
        </div>
      </div>

      <div className="h-screen" />
    </>
  );
}
