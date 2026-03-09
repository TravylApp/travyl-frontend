"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Blue,
  PAPER_PLANE_PATHS,
  PAPER_PLANE_VIEWBOX,
  TAKEOFF_LOADING_MESSAGES,
} from "@travyl/shared";
import { PaperPlane } from "./PaperPlane";

// ─── Timing constants (ms) ─────────────────────────────────────
const PASS1_DUR = 600;
const GAP_DUR = 200;
const PASS2_DUR = 1600;
const FLIGHT_TOTAL = PASS1_DUR + GAP_DUR + PASS2_DUR; // 2400
const LOADING_START = 2600;
const ANIMATION_END = 4600;

// Parse viewBox to get scale factor for canvas Path2D
const vbParts = PAPER_PLANE_VIEWBOX.split(" ").map(Number);
const VB_SIZE = vbParts[2]; // 64

interface TakeoffTransitionProps {
  visible: boolean;
  buttonRect: DOMRect | null;
  onComplete: () => void;
}

export function TakeoffTransition({
  visible,
  buttonRect,
  onComplete,
}: TakeoffTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"fly" | "loading">("fly");
  const [msgIndex, setMsgIndex] = useState(0);

  const stableOnComplete = useCallback(() => onComplete(), [onComplete]);

  // Reset phase when visibility changes
  useEffect(() => {
    if (visible) {
      setPhase("fly");
      setMsgIndex(0);
    }
  }, [visible]);

  // Phase timers
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setPhase("loading"), LOADING_START);
    const t2 = setTimeout(() => stableOnComplete(), ANIMATION_END);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible, stableOnComplete]);

  // Loading message rotation
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(
      () => setMsgIndex((i) => (i + 1) % TAKEOFF_LOADING_MESSAGES.length),
      700
    );
    return () => clearInterval(interval);
  }, [phase]);

  // Canvas animation — two-pass flight
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

    // Trail of past positions
    const trail: { x: number; y: number; age: number }[] = [];

    const originX = buttonRect ? buttonRect.left + buttonRect.width / 2 : W() * 0.55;
    const originY = buttonRect ? buttonRect.top + buttonRect.height / 2 : H() * 0.5;
    const pass1TravelX = W() + 60 - originX;
    const pass2CenterY = H() * 0.45;
    const amplitude = H() * 0.08;

    // Build Path2D objects for the paper plane
    const planePaths = PAPER_PLANE_PATHS.map((d) => new Path2D(d));

    const startTime = performance.now();
    let animId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, W(), H());

      let planeX: number,
        planeY: number,
        bankAngle: number,
        planeAlpha: number,
        planeScale: number;
      let showPlane = true;
      let inPass: 0 | 1 | 2 = 0;

      if (elapsed < PASS1_DUR) {
        // ─── Pass 1: Takeoff arc from button ───
        inPass = 1;
        const p = elapsed / PASS1_DUR;

        const xEase = p * p;
        planeX = originX + xEase * pass1TravelX;

        const liftHeight = H() * 0.15;
        const yEase = p * p * p * p;
        planeY = originY - yEase * liftHeight;

        const dxdp = 2 * p * pass1TravelX + 0.001;
        const dydp = -4 * p * p * p * liftHeight;
        bankAngle = Math.atan2(dydp, dxdp);

        planeAlpha = 1;
        planeScale = 0.45 + Math.sqrt(p) * 0.55;
      } else if (elapsed < PASS1_DUR + GAP_DUR) {
        // ─── Gap: no plane visible ───
        showPlane = false;
        planeX = -100;
        planeY = -100;
        bankAngle = 0;
        planeAlpha = 0;
        planeScale = 0;
      } else if (elapsed < FLIGHT_TOTAL) {
        // ─── Pass 2: Sine wave sweep ───
        inPass = 2;
        const p2Elapsed = elapsed - PASS1_DUR - GAP_DUR;
        const p = p2Elapsed / PASS2_DUR;

        const easeP = 1 - (1 - p) * (1 - p);
        const totalTravel = W() + 80;
        planeX = -40 + easeP * totalTravel;

        const freq = 1.2;
        const ampEnv = 1 - Math.exp(-p * 10);
        planeY =
          pass2CenterY -
          Math.sin(p * Math.PI * 2 * freq) * amplitude * ampEnv;

        const dxdp = 2 * (1 - p) * totalTravel + 0.001;
        const omega = Math.PI * 2 * freq;
        const dAmpEnv = 10 * Math.exp(-p * 10);
        const sinVal = Math.sin(p * omega);
        const cosVal = Math.cos(p * omega);
        const dydp2 =
          -(cosVal * omega * ampEnv + sinVal * dAmpEnv) * amplitude;
        bankAngle = Math.atan2(dydp2, dxdp) * 0.7 - 0.04;

        planeAlpha = p > 0.88 ? 1 - (p - 0.88) / 0.12 : 1;
        planeScale =
          p < 0.05
            ? 0.5 + (p / 0.05) * 0.5
            : p > 0.85
              ? 1 - ((p - 0.85) / 0.15) * 0.5
              : 1;
      } else {
        showPlane = false;
        planeX = -100;
        planeY = -100;
        bankAngle = 0;
        planeAlpha = 0;
        planeScale = 0;
      }

      // Record trail
      if (showPlane && planeX > -30 && planeX < W() + 30) {
        trail.push({ x: planeX, y: planeY, age: 0 });
      }

      // Rapidly age trail during gap
      if (elapsed >= PASS1_DUR && elapsed < PASS1_DUR + GAP_DUR) {
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].age += 5;
          if (trail[i].age > 50) trail.splice(i, 1);
        }
      }

      // Normal trail aging
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age += 1;
        if (trail[i].age > 50) trail.splice(i, 1);
      }

      // Draw trail dots
      for (const pt of trail) {
        const alpha = Math.max(0, 1 - pt.age / 50) * 0.45;
        const radius = Math.max(0.5, (1 - pt.age / 50) * 2.5);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      // Draw trail connecting line
      if (trail.length > 3) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw airplane using Path2D
      if (showPlane) {
        ctx.save();
        ctx.translate(planeX, planeY);
        ctx.rotate(bankAngle);

        ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
        ctx.shadowBlur = 20 * planeScale;

        const size = 48 * planeScale;
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
      }

      // Sparkle particles (pass 2 only)
      if (inPass === 2 && Math.random() < 0.35) {
        const sparkX = planeX - 8 - Math.random() * 18;
        const sparkY = planeY + (Math.random() - 0.5) * 14;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + Math.random() * 0.3})`;
        ctx.fill();
      }

      if (elapsed < FLIGHT_TOTAL) {
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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: Blue[600] }}
        />

        {/* Canvas for airplane flight */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Loading phase */}
        <AnimatePresence>
          {phase === "loading" && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col items-center gap-5 px-6">
                {/* Spinner with orbiting airplane */}
                <div className="relative w-16 h-16">
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <div className="absolute -top-2 opacity-60">
                      <PaperPlane
                        size={16}
                        className="-rotate-12"
                        style={{ color: "white" }}
                      />
                    </div>
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white/70"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>
                </div>

                {/* Rotating message */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIndex}
                    className="text-white text-lg font-semibold"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {TAKEOFF_LOADING_MESSAGES[msgIndex]}
                  </motion.p>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40"
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [1, 1.4, 1],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.2,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
