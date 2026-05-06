"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PaperPlane } from "./PaperPlane";
import { Blue, PAPER_PLANE_PATHS, PAPER_PLANE_VIEWBOX } from "@travyl/shared";

const VB_SIZE = parseInt(PAPER_PLANE_VIEWBOX.split(" ")[2]) || 64;

const MESSAGES = [
  "Understanding your trip...",
  "Searching for the best places...",
  "Checking weather forecasts...",
  "Finding hidden gems...",
  "Building your day-by-day plan...",
  "Curating hotels & flights...",
  "Almost there...",
];

interface TakeoffTransitionProps {
  visible: boolean;
  buttonRect: DOMRect | null;
  onComplete: () => void;
  statusMessage?: string;
  completed?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function TakeoffTransition({ visible, buttonRect, onComplete, statusMessage, completed, error, onRetry }: TakeoffTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Reset on visibility change
  useEffect(() => {
    if (visible) {
      setMsgIndex(0);
      setProgress(0);
      setShowContent(false);
      // Show loading content shortly after flight starts
      const t = setTimeout(() => setShowContent(true), 900);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Cycle messages every 3.5s
  useEffect(() => {
    if (!visible || !showContent) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [visible, showContent]);

  // Fake progress that slows down as it approaches 90%
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

  // Snap to 100% when completed
  useEffect(() => {
    if (completed) setProgress(100);
  }, [completed]);

  // Focus trap: when visible, trap Tab within the overlay
  useEffect(() => {
    if (!visible || !overlayRef.current) return;
    const overlay = overlayRef.current;
    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length < 2) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [visible, error, completed]);

  // Canvas — single smooth flight arc
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width;
    const H = () => canvas.height;

    const originX = buttonRect ? buttonRect.left + buttonRect.width / 2 : W() * 0.1;
    const originY = buttonRect ? buttonRect.top + buttonRect.height / 2 : H() * 0.6;
    const trail: { x: number; y: number; age: number }[] = [];
    const planePaths = PAPER_PLANE_PATHS.map((d) => new Path2D(d));

    const FLIGHT_DUR = 1600;
    const startTime = performance.now();
    let animId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, W(), H());

      if (elapsed < FLIGHT_DUR) {
        const p = elapsed / FLIGHT_DUR;

        // Smooth ease-out curve from origin to off-screen right
        const ease = 1 - Math.pow(1 - p, 3);
        const endX = W() + 60;
        const planeX = originX + ease * (endX - originX);

        // Gentle upward arc
        const arcHeight = H() * 0.25;
        const planeY = originY - Math.sin(p * Math.PI * 0.5) * arcHeight;

        // Slight upward bank angle
        const bankAngle = -0.15 - p * 0.1;
        const planeScale = 0.5 + p * 0.5;
        const planeAlpha = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;

        // Record trail
        trail.push({ x: planeX, y: planeY, age: 0 });

        // Age trail
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].age += 1;
          if (trail[i].age > 60) trail.splice(i, 1);
        }

        // Draw dotted trail
        for (let i = 0; i < trail.length; i += 3) {
          const pt = trail[i];
          const alpha = Math.max(0, 1 - pt.age / 60) * 0.3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }

        // Draw airplane
        ctx.save();
        ctx.translate(planeX, planeY);
        ctx.rotate(bankAngle);
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 15;

        const size = 40 * planeScale;
        const scale = size / VB_SIZE;
        ctx.scale(scale, scale);
        ctx.translate(-VB_SIZE / 2, -VB_SIZE / 2);

        ctx.globalAlpha = planeAlpha;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2 / scale;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        for (const path of planePaths) {
          ctx.fill(path);
          ctx.stroke(path);
        }
        ctx.restore();

        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [visible, buttonRect]);

  if (!visible) return null;

  const displayMessage = statusMessage || MESSAGES[msgIndex];
  const displayProgress = progress;

  return (
    <div className="fixed inset-0 z-[100]" ref={overlayRef}>
      <div className="absolute inset-0" style={{ backgroundColor: Blue[600] }} />

      {/* Canvas for airplane flight */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Loading content — fades in after flight */}
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
            <div role="alert">
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
                <Link
                  href="/trips"
                  className="px-5 py-2.5 bg-white/15 text-white rounded-full text-sm font-medium hover:bg-white/25 transition-colors"
                >
                  Go to Trips
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
                <p className="text-white/30 text-[10px] text-right mt-1 tabular-nums">{Math.round(displayProgress)}%</p>
              </div>

              {/* Message */}
              <p
                key={displayMessage}
                className="text-white/80 text-base font-medium text-center animate-[fadeSlideIn_0.4s_ease-out]"
                aria-live="polite"
              >
                {displayMessage}
              </p>

              {/* Subtle tip */}
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
