"use client";

import { useRef, useEffect } from "react";
import { useInView } from "motion/react";

export function AnimatedCounter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current || !ref.current) return;
    hasAnimated.current = true;
    const duration = 2000;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;

      if (ref.current) {
        ref.current.textContent = decimals > 0
          ? current.toFixed(decimals) + suffix
          : Math.round(current).toLocaleString() + suffix;
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, suffix, decimals]);

  return <span ref={ref}>0{suffix}</span>;
}
