import React from "react";
import { usePageAnimation, type PageAnimationOptions } from "../hooks/usePageAnimation";

interface AnimatedPageProps extends PageAnimationOptions {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  className = "",
  staggerDelay = 55,
  duration = 600,
  selector = ".animate-item, section, .stat-card, .chart-card, .grid-card",
  translateY = 16,
}) => {
  const containerRef = usePageAnimation({
    staggerDelay,
    duration,
    selector,
    translateY,
  });

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {children}
    </div>
  );
};

export default AnimatedPage;
