"use client";

import { useRef, useEffect, useState } from "react";

export function AnimatedCounter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!ref.current || value === 0 || hasAnimated) return;

    // Use IntersectionObserver to start animation when visible
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHasAnimated(true);

        const duration = 2000;
        const start = performance.now();
        let raf: number;

        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = eased * value;

          if (el) {
            el.textContent = decimals > 0
              ? current.toFixed(decimals) + suffix
              : Math.round(current).toLocaleString() + suffix;
          }

          if (progress < 1) {
            raf = requestAnimationFrame(tick);
          }
        };

        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => { observer.disconnect(); };
  }, [value, suffix, decimals, hasAnimated]);

  return <span ref={ref}>0{suffix}</span>;
}
