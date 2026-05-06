"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { PaperPlane } from "./PaperPlane";
import { Blue } from "@travyl/shared";
import { ErrorBoundary } from "./ErrorBoundary";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWebGLSupported } from "@/hooks/useWebGLSupported";

const MESSAGES = [
  "Understanding your trip...",
  "Searching for the best places...",
  "Checking weather forecasts...",
  "Finding hidden gems...",
  "Building your day-by-day plan...",
  "Curating hotels & flights...",
  "Almost there...",
];

const TakeoffScene3D = dynamic(() => import("./TakeoffScene3D"), {
  ssr: false,
  loading: () => null,
});

interface TakeoffTransitionProps {
  visible: boolean;
  onComplete: () => void;
  statusMessage?: string;
  completed?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function TakeoffTransition({ visible, onComplete, statusMessage, completed, error, onRetry }: TakeoffTransitionProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showScene3D, setShowScene3D] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebGLSupported();

  // Determine if 3D scene should show (after initial checks)
  useEffect(() => {
    setShowScene3D(visible && !prefersReducedMotion && webglSupported);
  }, [visible, prefersReducedMotion, webglSupported]);

  // Reset on visibility change
  useEffect(() => {
    if (visible) {
      setMsgIndex(0);
      setProgress(0);
      setShowContent(false);
      const t = setTimeout(() => setShowContent(true), 900);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Cycle messages
  useEffect(() => {
    if (!visible || !showContent) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [visible, showContent]);

  // Fake progress
  useEffect(() => {
    if (!visible || !showContent || completed) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const increment = Math.max(0.5, (90 - p) * 0.06);
        return Math.min(90, p + increment);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [visible, showContent, completed]);

  // Snap to 100%
  useEffect(() => {
    if (completed) setProgress(100);
  }, [completed]);

  const handle3DExit = useCallback(() => {
    setShowScene3D(false);
    onComplete();
  }, [onComplete]);

  if (!visible) return null;

  const displayMessage = statusMessage || MESSAGES[msgIndex];
  const displayProgress = progress;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" style={{ backgroundColor: Blue[600] }} />

      {/* 3D scene — behind HUD */}
      {showScene3D && (
        <ErrorBoundary fallback={null}>
          <TakeoffScene3D
            completed={!!completed}
            onExit={handle3DExit}
          />
        </ErrorBoundary>
      )}

      {/* Loading content — always visible */}
      <div
        className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-700"
        style={{ opacity: showContent ? 1 : 0, pointerEvents: showContent ? "auto" : "none" }}
      >
        <div className="flex flex-col items-center gap-6 px-6 max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-2xl font-black tracking-[2px] text-white/90">TRAVYL</span>
            <PaperPlane size={28} className="text-white/90" />
          </div>

          {error ? (
            <>
              <p className="text-white text-base font-medium text-center">{error}</p>
              <div className="flex gap-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-5 py-2.5 bg-white text-[#1e3a5f] rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <a
                  href="/trips"
                  className="px-5 py-2.5 bg-white/15 text-white rounded-full text-sm font-medium hover:bg-white/25 transition-colors"
                >
                  Go to Trips
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
                <p className="text-white/30 text-[10px] text-right mt-1 tabular-nums">{Math.round(displayProgress)}%</p>
              </div>
              <p
                key={displayMessage}
                className="text-white/80 text-base font-medium text-center animate-[fadeSlideIn_0.4s_ease-out]"
              >
                {displayMessage}
              </p>
              <p className="text-white/25 text-xs text-center max-w-[280px]">
                Travyl uses AI to find the best restaurants, hidden gems, and optimal routes for your trip.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
