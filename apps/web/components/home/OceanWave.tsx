"use client";

export function OceanWave() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 160, marginBottom: -1 }}>
      <style>{`
        @keyframes wave1 {
          0%, 100% { d: path("M0,40 C200,28 400,50 600,35 C800,20 1000,45 1200,32 L1200,160 L0,160 Z"); }
          50% { d: path("M0,32 C200,48 400,25 600,42 C800,52 1000,28 1200,40 L1200,160 L0,160 Z"); }
        }
        @keyframes wave2 {
          0%, 100% { d: path("M0,95 C200,82 400,105 600,90 C800,75 1000,100 1200,88 L1200,160 L0,160 Z"); }
          50% { d: path("M0,88 C200,100 400,80 600,95 C800,105 1000,82 1200,95 L1200,160 L0,160 Z"); }
        }
        @keyframes wave3 {
          0%, 100% { d: path("M0,130 C200,122 400,138 600,128 C800,118 1000,135 1200,125 L1200,160 L0,160 Z"); }
          50% { d: path("M0,125 C200,135 400,120 600,130 C800,138 1000,122 1200,132 L1200,160 L0,160 Z"); }
        }
      `}</style>
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "100%" }}
      >
        <defs>
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ocean-primary)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--ocean-primary)" />
          </linearGradient>
        </defs>
        <path
          fill="url(#oceanGrad)"
          d="M0,40 C200,28 400,50 600,35 C800,20 1000,45 1200,32 L1200,160 L0,160 Z"
          style={{ animation: "wave1 8s ease-in-out infinite" }}
        />
        <path
          fill="var(--sand-wash)"
          opacity={0.35}
          d="M0,95 C200,82 400,105 600,90 C800,75 1000,100 1200,88 L1200,160 L0,160 Z"
          style={{ animation: "wave2 9s ease-in-out infinite" }}
        />
        <path
          fill="var(--sand-base)"
          d="M0,130 C200,122 400,138 600,128 C800,118 1000,135 1200,125 L1200,160 L0,160 Z"
          style={{ animation: "wave3 10s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}
