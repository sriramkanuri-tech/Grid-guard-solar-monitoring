import React, { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

interface AnimatedNumberProps {
  value: number | string;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 1,
  className = "",
  prefix = "",
  suffix = "",
}) => {
  const numericTarget = typeof value === "number" ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState<string>(
    numericTarget.toFixed(decimals)
  );
  const currentValRef = useRef<{ val: number }>({ val: numericTarget });
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    const fromVal = currentValRef.current.val;
    const toVal = numericTarget;

    if (Math.abs(fromVal - toVal) < 0.0001) {
      setDisplayValue(toVal.toFixed(decimals));
      return;
    }

    if (animRef.current) {
      try {
        if (typeof animRef.current.cancel === "function") animRef.current.cancel();
      } catch {
        // ignore
      }
    }

    const proxy = { val: fromVal };
    currentValRef.current = proxy;

    animRef.current = animate(proxy, {
      val: toVal,
      duration: 550,
      ease: "out(4)",
      onUpdate: () => {
        setDisplayValue(proxy.val.toFixed(decimals));
      },
      onComplete: () => {
        setDisplayValue(toVal.toFixed(decimals));
      },
    });

    return () => {
      if (animRef.current) {
        try {
          if (typeof animRef.current.cancel === "function") animRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [numericTarget, decimals]);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
