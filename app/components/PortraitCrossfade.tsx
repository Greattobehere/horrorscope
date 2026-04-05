"use client";

import React from "react";

interface PortraitCrossfadeProps {
  sliders?: {
    love: number;
    wealth: number;
    health: number;
    fame: number;
    wisdom: number;
  };
  isControlled?: boolean;
  className?: string;
}

// Portrait source constants
const WITCH_SRC = "/assets/witch-moira.png";
const HAUNTED_SRC = "/assets/moira-cheerful.png"; // Temporary fallback
const FRIENDLY_SRC = "/assets/moira-cheerful.png";

/**
 * Compute omen score: weighted average of "positive" slider directions
 * Score range: 0–100
 * ≤ 33: Witch form
 * 34–66: Haunted form
 * ≥ 67: Friendly form
 */
function computeOmenScore(sliders: {
  love: number;
  wealth: number;
  health: number;
  fame: number;
  wisdom: number;
}): number {
  // Each slider is 1–10; higher values = "better" outcomes
  const scores = [
    sliders.love,
    sliders.wealth,
    sliders.health,
    sliders.fame,
    sliders.wisdom,
  ];

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round((average / 10) * 100); // Convert 1–10 scale to 0–100
}

export default function PortraitCrossfade({
  sliders = { love: 5, wealth: 5, health: 5, fame: 5, wisdom: 5 },
  isControlled = false,
  className = "w-full h-full object-cover object-top",
}: PortraitCrossfadeProps) {
  const omenScore = computeOmenScore(sliders);

  // Determine which portrait to show
  let portraitSrc: string;
  if (omenScore <= 33) {
    portraitSrc = WITCH_SRC;
  } else if (omenScore >= 67) {
    portraitSrc = FRIENDLY_SRC;
  } else {
    portraitSrc = HAUNTED_SRC;
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Witch form — omen ≤ 33 */}
      <img
        src={WITCH_SRC}
        alt="Witch Sireal"
        className={`${className} transition-opacity duration-[1500ms] absolute inset-0`}
        draggable={false}
        aria-hidden="true"
        style={{
          opacity: omenScore <= 33 ? 1 : 0,
          pointerEvents: omenScore <= 33 ? "auto" : "none",
        }}
      />

      {/* Mid form (haunted) — 33 < omen < 67 */}
      <img
        src={HAUNTED_SRC}
        alt="Haunted Sireal"
        className={`${className} transition-opacity duration-[1500ms] absolute inset-0`}
        draggable={false}
        aria-hidden="true"
        style={{
          opacity: omenScore > 33 && omenScore < 67 ? 1 : 0,
          pointerEvents: omenScore > 33 && omenScore < 67 ? "auto" : "none",
        }}
      />

      {/* Friendly form — omen ≥ 67 */}
      <img
        src={FRIENDLY_SRC}
        alt="Cheerful Sireal"
        className={`${className} transition-opacity duration-[1500ms] absolute inset-0`}
        draggable={false}
        aria-hidden="true"
        style={{
          opacity: omenScore >= 67 ? 1 : 0,
          pointerEvents: omenScore >= 67 ? "auto" : "none",
        }}
      />

      {/* Debug: omen score display (optional, remove in production) */}
      {isControlled && (
        <div
          className="absolute bottom-2 left-2 text-xs text-[#E3B84B] bg-black/50 px-2 py-1 rounded"
          aria-hidden="true"
        >
          Omen: {omenScore}
        </div>
      )}
    </div>
  );
}
