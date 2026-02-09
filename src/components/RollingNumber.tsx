import { useEffect, useRef, useState } from "react";

interface RollingNumberProps {
  value: number;
  className?: string;
  initialWord?: string;
  initialDelay?: number;
}

const CHARS = ["B", "A", "N", "G", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function RollingChar({
  target,
  initial,
  delay = 0,
}: {
  target: string;
  initial?: string;
  delay?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initial) {
      return CHARS.indexOf(initial);
    }
    return CHARS.indexOf("0");
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const targetIndex = CHARS.indexOf(target);
    if (targetIndex === -1) return;

    const timeout = setTimeout(() => {
      setIsAnimating(true);
      setCurrentIndex(targetIndex);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, delay]);

  return (
    <span className="inline-block h-[1em] overflow-hidden relative">
      <span
        className="inline-flex flex-col transition-transform"
        style={{
          transform: `translateY(-${currentIndex * (100 / CHARS.length)}%)`,
          transitionDuration: isAnimating ? "800ms" : "0ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {CHARS.map((char) => (
          <span
            key={char}
            className="h-[1em] flex items-center justify-center"
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  );
}

export function RollingNumber({
  value,
  className = "",
  initialWord = "BANG",
  initialDelay = 600,
}: RollingNumberProps) {
  const formattedValue = value.toString();
  const digits = formattedValue.split("");
  const initialChars = initialWord.split("");
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (value > 0 && !hasLoaded) {
      // Small delay to ensure "BANG" is visible first
      const timeout = setTimeout(() => setHasLoaded(true), 50);
      return () => clearTimeout(timeout);
    }
  }, [value, hasLoaded]);

  // Before data loads, show initial word using RollingChar (no animation)
  // After data loads, show rolling animation to the number
  const displayChars = hasLoaded ? digits : initialChars;

  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {displayChars.map((char, index) => (
        <RollingChar
          key={hasLoaded ? `loaded-${index}` : `initial-${index}`}
          target={hasLoaded ? char : initialChars[index]}
          initial={initialChars[index]}
          delay={hasLoaded ? initialDelay + index * 50 : 0}
        />
      ))}
    </span>
  );
}
