import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

export const DescribeTripVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animations (happen once, then stay)
  const phoneEntry = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const typingProgress = Math.min(spring({ frame: frame - 15, fps, config: { damping: 20 } }), 1);

  // Only these loop (subtle floating)
  const floatY = Math.sin(frame * 0.05) * 4;
  const containerRotateY = Math.sin(frame * 0.02) * 3;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        justifyContent: "center",
        alignItems: "center",
        perspective: 1000,
      }}
    >
      {/* Phone - 3D layered */}
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `translateY(${floatY}px) rotateY(${containerRotateY}deg)`,
        }}
      >
        {/* Phone shadow */}
        <div
          style={{
            position: "absolute",
            bottom: -15,
            left: 15,
            width: 100,
            height: 15,
            background: "radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />

        {/* Phone body */}
        <div
          style={{
            width: 120,
            height: 210,
            borderRadius: 20,
            background: "linear-gradient(145deg, #1e3a5f 0%, #2d5a87 100%)",
            padding: 6,
            boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
            transform: `scale(${phoneEntry})`,
          }}
        >
          {/* Screen */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 14,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Status bar */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ width: 16, height: 3, background: "#cbd5e1", borderRadius: 2 }} />
              <div style={{ width: 24, height: 3, background: "#cbd5e1", borderRadius: 2 }} />
            </div>

            {/* Search/Input - stays filled */}
            <div
              style={{
                background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                borderRadius: 10,
                padding: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ height: 6, width: "80%", background: "#F59E0B", borderRadius: 3, marginBottom: 4 }} />
              <div style={{ height: 4, width: "50%", background: "rgba(245, 158, 11, 0.4)", borderRadius: 2 }} />
            </div>

            {/* Response lines - stay filled */}
            <div style={{ height: 5, width: "70%", background: "rgba(30, 58, 95, 0.12)", borderRadius: 3, marginBottom: 6 }} />
            <div style={{ height: 5, width: "85%", background: "rgba(30, 58, 95, 0.08)", borderRadius: 3, marginBottom: 6 }} />
            <div style={{ height: 5, width: "55%", background: "rgba(30, 58, 95, 0.06)", borderRadius: 3 }} />

            <div style={{ flex: 1 }} />

            {/* Send button - stays visible */}
            <div
              style={{
                alignSelf: "flex-end",
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%)",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative dots - subtle float */}
      <div style={{ position: "absolute", right: 25, top: 35, transform: `translateY(${Math.sin(frame * 0.04) * 3}px)` }}>
        <div style={{ width: 14, height: 14, borderRadius: 5, background: "#F59E0B", opacity: 0.25 }} />
      </div>
      <div style={{ position: "absolute", left: 22, bottom: 40, transform: `translateY(${Math.sin(frame * 0.05 + 1) * 4}px)` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1e3a5f", opacity: 0.1 }} />
      </div>
    </AbsoluteFill>
  );
};
