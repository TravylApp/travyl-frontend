import { useRef, useEffect, useState, useCallback } from "react";

/**
 * Typewriter that updates via direct DOM — zero React re-renders.
 * Attach the returned ref to a <span>.
 */
export function useCyclingPlaceholderRef(phrases: string[], typeSpeed = 30, pauseMs = 2500, deleteSpeed = 18) {
  const elRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let idx = 0;
    let charPos = 0;
    let deleting = false;

    const tick = () => {
      const el = elRef.current;
      if (!el) { timeoutId = setTimeout(tick, 100); return; }
      const current = phrases[idx % phrases.length];

      if (!deleting) {
        charPos++;
        el.textContent = current.slice(0, charPos);
        if (charPos >= current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, pauseMs);
          return;
        }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        charPos--;
        el.textContent = current.slice(0, charPos);
        if (charPos <= 0) {
          deleting = false;
          idx++;
          timeoutId = setTimeout(tick, 300);
          return;
        }
        timeoutId = setTimeout(tick, deleteSpeed);
      }
    };

    timeoutId = setTimeout(tick, 800);
    return () => clearTimeout(timeoutId);
  }, [phrases, typeSpeed, pauseMs, deleteSpeed]);

  return elRef;
}

/**
 * Typewriter that returns a string — for use as input placeholder.
 * Batches React state updates to every ~120ms to avoid per-character re-renders.
 */
export function useCyclingPlaceholder(phrases: string[], typeSpeed = 30, pauseMs = 2500, deleteSpeed = 18) {
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let idx = 0;
    let charPos = 0;
    let deleting = false;
    let lastSync = 0;
    let current = "";

    const sync = () => { setPlaceholder(current); };

    const tick = () => {
      const phrase = phrases[idx % phrases.length];

      if (!deleting) {
        charPos++;
        current = phrase.slice(0, charPos);
        if (charPos >= phrase.length) {
          deleting = true;
          sync();
          timeoutId = setTimeout(tick, pauseMs);
          return;
        }
        // Batch: sync to React every ~120ms instead of every 25ms
        const now = performance.now();
        if (now - lastSync > 120) { lastSync = now; sync(); }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        charPos--;
        current = phrase.slice(0, charPos);
        if (charPos <= 0) {
          deleting = false;
          idx++;
          sync();
          timeoutId = setTimeout(tick, 300);
          return;
        }
        const now = performance.now();
        if (now - lastSync > 120) { lastSync = now; sync(); }
        timeoutId = setTimeout(tick, deleteSpeed);
      }
    };

    timeoutId = setTimeout(tick, 800);
    return () => clearTimeout(timeoutId);
  }, [phrases, typeSpeed, pauseMs, deleteSpeed]);

  return placeholder;
}
