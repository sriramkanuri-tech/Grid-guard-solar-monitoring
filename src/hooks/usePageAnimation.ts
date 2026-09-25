import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export interface PageAnimationOptions {
  staggerDelay?: number;
  duration?: number;
  selector?: string;
  translateY?: number;
}

/**
 * Reusable Anime.js hook for clean, professional page and section entrances.
 * Follows guidelines:
 * - Professional opacity and translateY entrance
 * - Staggered children
 * - Proper cleanup on unmount
 * - Duration: 500-700ms, easing: out(4)
 */
export function usePageAnimation(options: PageAnimationOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    staggerDelay = 55,
    duration = 600,
    selector = ".animate-item, section, .stat-card, .chart-card, .grid-card",
    translateY = 16,
  } = options;

  useEffect(() => {
    if (!containerRef.current) return;

    let animInstance: ReturnType<typeof animate> | null = null;

    try {
      const childElements = containerRef.current.querySelectorAll(selector);

      if (childElements.length > 0) {
        // Set initial state
        childElements.forEach((el) => {
          (el as HTMLElement).style.opacity = "0";
          (el as HTMLElement).style.transform = `translateY(${translateY}px)`;
        });

        animInstance = animate(childElements, {
          opacity: [0, 1],
          translateY: [translateY, 0],
          duration,
          delay: stagger(staggerDelay),
          ease: "out(4)",
        });
      } else {
        containerRef.current.style.opacity = "0";
        containerRef.current.style.transform = `translateY(${translateY}px)`;

        animInstance = animate(containerRef.current, {
          opacity: [0, 1],
          translateY: [translateY, 0],
          duration,
          ease: "out(4)",
        });
      }
    } catch (e) {
      console.warn("Anime.js entrance failed:", e);
    }

    return () => {
      if (animInstance) {
        try {
          if (typeof animInstance.pause === "function") animInstance.pause();
          if (typeof animInstance.cancel === "function") animInstance.cancel();
        } catch {
          // ignore cleanup issues
        }
      }
    };
  }, [staggerDelay, duration, selector, translateY]);

  return containerRef;
}
