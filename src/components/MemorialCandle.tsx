// src/components/MemorialCandle.tsx
"use client";

import { useState } from "react";

interface MemorialCandleProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  interactive?: boolean;
  className?: string;
}

export default function MemorialCandle({
  size = "sm",
  showLabel = false,
  label = "Vigil Candle",
  interactive = true,
  className = "",
}: MemorialCandleProps) {
  const [litCount, setLitCount] = useState<number>(1);
  const [isLit, setIsLit] = useState<boolean>(true);

  const sizeClasses = {
    sm: { container: "h-6 w-6", svg: "w-5 h-6", text: "text-xs" },
    md: { container: "h-9 w-9", svg: "w-7 h-9", text: "text-sm" },
    lg: { container: "h-12 w-12", svg: "w-10 h-12", text: "text-base" },
  }[size];

  const handleToggle = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    setIsLit((prev) => !prev);
    if (!isLit) {
      setLitCount((c) => c + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${
        interactive ? "cursor-pointer group select-none" : ""
      } ${className}`}
      onClick={handleToggle}
      title={
        isLit
          ? `${label} (Active vigil · Click to pause)`
          : `${label} (Click to light candle)`
      }
      aria-label={label}
    >
      <div className={`relative flex items-center justify-center ${sizeClasses.container}`}>
        {/* Flame radial aura when lit */}
        {isLit && (
          <div
            className="absolute top-0 h-4 w-4 rounded-full bg-amber-400/40 blur-sm candle-glow-pulse"
            aria-hidden="true"
          />
        )}

        <svg
          className={`${sizeClasses.svg} transition-transform duration-300 ${
            interactive ? "group-hover:scale-110" : ""
          }`}
          viewBox="0 0 32 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Flame & Glow (rendered when lit) */}
          {isLit ? (
            <g className="candle-flame-anim">
              {/* Outer glow flame */}
              <path
                d="M16 2 C19 8, 22 12, 21 16 C20 19.5, 17.5 21, 16 21 C14.5 21, 12 19.5, 11 16 C10 12, 13 8, 16 2 Z"
                fill="url(#flame-outer)"
                opacity="0.9"
              />
              {/* Inner bright yellow flame core */}
              <path
                d="M16 6 C17.8 10, 19.2 13, 18.5 15.5 C17.8 17.5, 16.8 18.5, 16 18.5 C15.2 18.5, 14.2 17.5, 13.5 15.5 C12.8 13, 14.2 10, 16 6 Z"
                fill="url(#flame-inner)"
              />
              {/* Hot blue/white base */}
              <ellipse cx="16" cy="18" rx="1.8" ry="1.2" fill="#FEF08A" opacity="0.9" />
            </g>
          ) : (
            /* Subtle Smoke wisps when unlit */
            <path
              d="M16 19 C15 15, 18 12, 16 8"
              stroke="#9CA3AF"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          )}

          {/* Candle Wick */}
          <line
            x1="16"
            y1="19"
            x2="16"
            y2="23"
            stroke="#374151"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Candle Body / Wax Stick */}
          <rect
            x="10"
            y="23"
            width="12"
            height="18"
            rx="2"
            fill="url(#wax-gradient)"
            stroke="#D1D5DB"
            strokeWidth="0.8"
          />

          {/* Wax Drip highlights */}
          <path
            d="M10 23 C11 25, 12 26, 12.5 24.5 C13 23, 14 23, 14.5 25 C15 27, 16 26.5, 17 24 C18 23, 19.5 25, 20.5 23.5 C21 23, 22 23, 22 23"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Candle Base Plate shadow */}
          <ellipse cx="16" cy="41" rx="7" ry="1.5" fill="#9CA3AF" opacity="0.4" />

          {/* Gradients */}
          <defs>
            <linearGradient id="flame-outer" x1="16" y1="2" x2="16" y2="21" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>

            <linearGradient id="flame-inner" x1="16" y1="6" x2="16" y2="18.5" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="60%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <linearGradient id="wax-gradient" x1="10" y1="23" x2="22" y2="41" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="40%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showLabel && (
        <span
          className={`font-medium text-amber-700 dark:text-amber-400 ${sizeClasses.text} flex items-center gap-1`}
        >
          <span>{label}</span>
          {interactive && litCount > 1 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
              +{litCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
