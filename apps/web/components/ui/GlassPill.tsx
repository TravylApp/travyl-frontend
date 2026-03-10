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
          transition-all duration-150 ease-out
          group
          ${className}
        `}
        {...props}
      >
        {/* Glass base layer with gradient */}
        <span
          className="absolute inset-0 rounded-full transition-all duration-150 group-hover:brightness-110 group-active:brightness-90"
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
          className="absolute inset-0 rounded-full transition-opacity duration-150 group-hover:opacity-100 opacity-70"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 60% at 50% 0%,
                rgba(255, 255, 255, 0.35) 0%,
                transparent 60%
              )
            `,
          }}
        />

        {/* Specular highlight - top edge light reflection */}
        <span
          className="absolute inset-x-[2px] top-[1px] h-[1px] rounded-full transition-opacity duration-150 group-hover:opacity-100 opacity-60"
          style={{
            background: `linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.7) 20%,
              rgba(255, 255, 255, 0.9) 50%,
              rgba(255, 255, 255, 0.7) 80%,
              transparent 100%
            )`,
          }}
        />

        {/* Bottom edge shadow for depth */}
        <span
          className="absolute inset-x-[2px] bottom-[1px] h-[1px] rounded-full opacity-30 transition-opacity duration-150 group-active:opacity-50"
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
          className="absolute inset-0 rounded-full pointer-events-none transition-all duration-150 group-hover:border-white/30"
          style={{
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        />

        {/* Outer glow - appears on hover */}
        <span
          className="absolute -inset-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background: `radial-gradient(
              ellipse 90% 60% at 50% 40%,
              rgba(255, 255, 255, 0.12) 0%,
              transparent 70%
            )`,
          }}
        />

        {/* Inner shadow on active - "pressed" effect */}
        <span
          className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 transition-opacity duration-75"
          style={{
            boxShadow: `inset 0 1px 2px rgba(0, 0, 0, 0.15)`,
          }}
        />

        {/* Content */}
        <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-transform duration-75 group-active:translate-y-[0.5px]">
          {children}
        </span>
      </button>
    );
  }
);

GlassPill.displayName = "GlassPill";
