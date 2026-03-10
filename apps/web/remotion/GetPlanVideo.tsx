import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

export const GetPlanVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animations (happen once, then stay)
  const cardEntry = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const pin1Scale = Math.min(spring({ frame: frame - 18, fps, config: { damping: 8, stiffness: 200 } }), 1);
  const pin2Scale = Math.min(spring({ frame: frame - 24, fps, config: { damping: 8, stiffness: 200 } }), 1);
  const pin3Scale = Math.min(spring({ frame: frame - 30, fps, config: { damping: 8, stiffness: 200 } }), 1);

  // Only these loop (subtle floating)
  const floatY = Math.sin(frame * 0.04) * 3;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        justifyContent: "center",
        alignItems: "center",
        perspective: 800,
      }}
    >
      {/* Card - 3D */}
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `translateY(${floatY}px) rotateX(5deg) rotateY(-3deg) scale(${cardEntry})`,
        }}
      >
        {/* Card shadow */}
        <div
          style={{
            position: "absolute",
            bottom: -12,
            left: 10,
            width: 140,
            height: 12,
            background: "radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* Card */}
        <div
          style={{
            width: 160,
            background: "white",
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Map area */}
          <div
            style={{
              height: 100,
              background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
              position: "relative",
            }}
          >
            {/* Grid pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.25,
                backgroundImage: `
                  linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: "18px 18px",
              }}
            />

            {/* Route line - stays drawn */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 160 100">
              <path
                d="M25 55 Q50 30 80 50 Q115 72 140 45"
                stroke="#1e3a5f"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>

            {/* Pin 1 - stays */}
            <div style={{ position: "absolute", left: 18, top: 42, transform: `scale(${pin1Scale})` }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #ef4444 0%, #dc2626 100%)",
                  boxShadow: "0 4px 10px rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.4)" }} />
              </div>
            </div>

            {/* Pin 2 - stays */}
            <div style={{ position: "absolute", left: 70, top: 40, transform: `scale(${pin2Scale})` }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%)",
                  boxShadow: "0 3px 8px rgba(245, 158, 11, 0.4)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.4)" }} />
              </div>
            </div>

            {/* Pin 3 - stays */}
            <div style={{ position: "absolute", right: 14, top: 38, transform: `scale(${pin3Scale})` }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #10B981 0%, #059669 100%)",
                  boxShadow: "0 4px 10px rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.4)" }} />
              </div>
            </div>
          </div>

          {/* Text content - stays */}
          <div style={{ padding: 14 }}>
            <div style={{ height: 10, width: "60%", background: "#1e3a5f", borderRadius: 5, marginBottom: 8 }} />
            <div style={{ height: 6, width: "80%", background: "#e5e7eb", borderRadius: 3, marginBottom: 6 }} />
            <div style={{ height: 6, width: "45%", background: "#e5e7eb", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Decorative */}
      <div style={{ position: "absolute", bottom: 28, left: 25, transform: `translateY(${Math.sin(frame * 0.05) * 3}px)` }}>
        <div style={{ width: 16, height: 16, borderRadius: 6, background: "#F59E0B", opacity: 0.2 }} />
      </div>
    </AbsoluteFill>
  );
};
