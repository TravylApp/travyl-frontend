import { useState, useRef, useEffect } from "react";

export function useCyclingPlaceholder(phrases: string[], typeSpeed = 50, pauseMs = 2000, deleteSpeed = 30) {
  const [placeholder, setPlaceholder] = useState("");
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = phrases[indexRef.current % phrases.length];

      if (!deletingRef.current) {
        charRef.current++;
        setPlaceholder(current.slice(0, charRef.current));

        if (charRef.current >= current.length) {
          deletingRef.current = true;
          return pauseMs;
        }
        return typeSpeed;
      } else {
        charRef.current--;
        setPlaceholder(current.slice(0, charRef.current));

        if (charRef.current <= 0) {
          deletingRef.current = false;
          indexRef.current++;
          return 300;
        }
        return deleteSpeed;
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const nextDelay = tick();
      timeoutId = setTimeout(schedule, nextDelay);
    };
    timeoutId = setTimeout(schedule, 800);
    return () => clearTimeout(timeoutId);
  }, [phrases, typeSpeed, pauseMs, deleteSpeed]);

  return placeholder;
}
