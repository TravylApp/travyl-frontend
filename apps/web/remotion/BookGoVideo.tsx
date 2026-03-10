import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

export const BookGoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animations (happen once, then stay)
  const suitcaseEntry = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const handleScale = Math.min(spring({ frame: frame - 8, fps, config: { damping: 15 } }), 1);
  const sticker1Scale = Math.min(spring({ frame: frame - 20, fps, config: { damping: 6, stiffness: 200 } }), 1);
  const sticker2Scale = Math.min(spring({ frame: frame - 28, fps, config: { damping: 6, stiffness: 200 } }), 1);
  const sticker3Scale = Math.min(spring({ frame: frame - 35, fps, config: { damping: 6, stiffness: 200 } }), 1);

  // Airplane - smooth scale/fade entry, then subtle float
  const planeDelay = 40;
  const planeProgress = Math.min(spring({ frame: frame - planeDelay, fps, config: { damping: 20, stiffness: 120 } }), 1);
  const planeScale = planeProgress;
  const planeOpacity = Math.min(planeProgress * 1.2, 1);
  const planeFloatY = Math.sin((frame - planeDelay) * 0.06) * 4;
  const planeRotate = -8 + Math.sin((frame - planeDelay) * 0.04) * 3;

  // Only these loop (subtle floating)
  const floatY = Math.sin(frame * 0.04) * 3;
  const floatRotate = Math.sin(frame * 0.025) * 2;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        justifyContent: "center",
        alignItems: "center",
        perspective: 800,
      }}
    >
      {/* Suitcase */}
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `
            translateY(${floatY}px)
            rotateX(${floatRotate}deg)
            rotateY(${interpolate(suitcaseEntry, [0, 1], [-20, 10])}deg)
            scale(${suitcaseEntry})
          `,
        }}
      >
        {/* Shadow */}
        <div
          style={{
            position: "absolute",
            bottom: -18,
            left: 15,
            width: 120,
            height: 18,
            background: "radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* Handle */}
        <div
          style={{
            width: 55,
            height: 28,
            marginLeft: 42,
            marginBottom: -4,
            background: "linear-gradient(180deg, #1e3a5f 0%, #0f2744 100%)",
            borderRadius: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 4,
            transform: `scaleY(${handleScale})`,
          }}
        >
          <div style={{ width: 40, height: 16, background: "#2d5a87", borderRadius: 4 }} />
        </div>

        {/* Suitcase body */}
        <div
          style={{
            width: 140,
            height: 115,
            borderRadius: 16,
            background: "linear-gradient(145deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%)",
            padding: 8,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          }}
        >
          {/* Inner */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, #2d5a87 0%, #1e3a5f 100%)",
              borderRadius: 10,
              position: "relative",
            }}
          >
            {/* Zipper line */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                width: 3,
                height: "100%",
                background: "linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)",
                transform: "translateX(-50%)",
                borderRadius: 2,
              }}
            />

            {/* Sticker 1 - Airplane */}
            <div
              style={{
                position: "absolute",
                left: 16,
                top: 25,
                transform: `scale(${sticker1Scale}) rotate(-8deg)`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%)",
                  boxShadow: "0 5px 14px rgba(245, 158, 11, 0.45)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
            </div>

            {/* Sticker 2 - Pin */}
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 22,
                transform: `scale(${sticker2Scale}) rotate(12deg)`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #f87171 0%, #ef4444 100%)",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.45)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
            </div>

            {/* Sticker 3 - Tag */}
            <div
              style={{
                position: "absolute",
                left: 16,
                bottom: 14,
                transform: `scale(${sticker3Scale})`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 18,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />
            </div>

            {/* Corner details */}
            <div style={{ position: "absolute", top: 6, left: 6, width: 14, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", bottom: 6, right: 6, width: 14, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>
      </div>

      {/* Airplane - elegant entry with subtle float */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(${planeFloatY}px) scale(${planeScale}) rotate(${planeRotate}deg)`,
          opacity: planeOpacity,
          filter: "drop-shadow(0 6px 12px rgba(30, 58, 95, 0.25))",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
          {/* Contrail - stays */}
          <path d="M3 21 L14 21" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 3" />
          {/* Plane body */}
          <path
            d="M38 21 L22 17 L22 13 L19 13 L19 17 L12 19 L12 23 L19 25 L19 29 L22 29 L22 25 L38 21Z"
            fill="url(#planeGrad2)"
          />
          <defs>
            <linearGradient id="planeGrad2" x1="12" y1="13" x2="38" y2="29">
              <stop offset="0%" stopColor="#2d5a87" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Decorative dots */}
      <div style={{ position: "absolute", bottom: 28, left: 25, transform: `translateY(${Math.sin(frame * 0.05) * 3}px)` }}>
        <div style={{ width: 14, height: 14, borderRadius: 5, background: "#F59E0B", opacity: 0.25 }} />
      </div>
      <div style={{ position: "absolute", top: 30, right: 25, transform: `translateY(${Math.sin(frame * 0.04 + 1) * 2}px)` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1e3a5f", opacity: 0.12 }} />
      </div>
    </AbsoluteFill>
  );
};
