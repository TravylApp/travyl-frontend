"use client";

import { useRef, useEffect, useState } from "react";

export function AnimatedCounter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (!ref.current || hasAnimated) return;
    // Skip if value hasn't loaded yet (still 0)
    if (value === 0) return;

    // Use IntersectionObserver to start animation when visible
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHasAnimated(true);
        prevValueRef.current = value;

        const duration = 2000;
        const start = performance.now();

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
            requestAnimationFrame(tick);
          }
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => { observer.disconnect(); };
  }, [value, suffix, decimals, hasAnimated]);

  // If value changes after animation already ran, update immediately
  useEffect(() => {
    if (hasAnimated && value !== prevValueRef.current && ref.current) {
      prevValueRef.current = value;
      ref.current.textContent = decimals > 0
        ? value.toFixed(decimals) + suffix
        : Math.round(value).toLocaleString() + suffix;
    }
  }, [value, hasAnimated, suffix, decimals]);

  return <span ref={ref}>0{suffix}</span>;
}
