"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const GlassPill = forwardRef<HTMLButtonElement, GlassPillProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          px-3.5 py-1.5 rounded-full
          text-xs font-medium text-white/95
          overflow-visible
          transition-all duration-200
          hover:scale-[1.02] active:scale-[0.98]
          group
          ${className}
        `}
        {...props}
      >
        {/* SVG Filters (defined once per button) */}
        <svg className="absolute w-0 h-0" aria-hidden>
          <defs>
            <filter id="glass-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            </filter>
            <filter id="glass-texture" x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="4"
                result="noise"
              />
              <feColorMatrix
                in="noise"
                type="saturate"
                values="0"
                result="desaturated"
              />
              <feComponentTransfer result="highlights">
                <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 0 0.02" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" in2="highlights" mode="screen" />
            </filter>
          </defs>
        </svg>

        {/* Background blur layer - captures and blurs what's behind */}
        <span
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ filter: "url(#glass-blur)" }}
        >
          <span className="absolute inset-[-20px]" />
        </span>

        {/* Glass base layer with gradient */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.25) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0.05) 100%
              )
            `,
            backdropFilter: "blur(12px) saturate(180%)",
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
          }}
        />

        {/* Inner gradient overlay for depth */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 60% at 50% 0%,
                rgba(255, 255, 255, 0.3) 0%,
                transparent 60%
              )
            `,
          }}
        />

        {/* Specular highlight - top edge light reflection */}
        <span
          className="absolute inset-x-[2px] top-[1px] h-[1px] rounded-full"
          style={{
            background: `linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.6) 20%,
              rgba(255, 255, 255, 0.8) 50%,
              rgba(255, 255, 255, 0.6) 80%,
              transparent 100%
            )`,
          }}
        />

        {/* Bottom edge shadow for depth */}
        <span
          className="absolute inset-x-[2px] bottom-[1px] h-[1px] rounded-full opacity-30"
          style={{
            background: `linear-gradient(
              90deg,
              transparent 0%,
              rgba(0, 0, 0, 0.3) 20%,
              rgba(0, 0, 0, 0.4) 50%,
              rgba(0, 0, 0, 0.3) 80%,
              transparent 100%
            )`,
          }}
        />

        {/* Glass border with gradient */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1px solid transparent",
            background: `
              linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1)) padding-box,
              linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1)) border-box
            `,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
        />

        {/* Subtle outer glow */}
        <span
          className="absolute -inset-[1px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(
              ellipse 80% 50% at 50% 50%,
              rgba(255, 255, 255, 0.15) 0%,
              transparent 70%
            )`,
          }}
        />

        {/* Content */}
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
          {children}
        </span>
      </button>
    );
  }
);

GlassPill.displayName = "GlassPill";
