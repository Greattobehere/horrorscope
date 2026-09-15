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

// Portrait source constants — Moira (evil twin) and Sonia (good twin)
const MOIRA_SRC = "/assets/moira.png";
const SONIA_SRC = "/assets/sonia.png";

/**
 * Compute omen score: weighted average of "positive" slider directions
 * Score range: 0–100
 * < 50: Moira (the fate is going badly)
 * ≥ 50: Sonia (the fate is going well)
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
  const showsSonia = omenScore >= 50;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Moira — the fate is going badly */}
      <img
        src={MOIRA_SRC}
        alt="Moira"
        className={`${className} transition-opacity duration-[1500ms] absolute inset-0`}
        draggable={false}
        aria-hidden="true"
        style={{
          opacity: showsSonia ? 0 : 1,
          pointerEvents: showsSonia ? "none" : "auto",
        }}
      />

      {/* Sonia — the fate is going well */}
      <img
        src={SONIA_SRC}
        alt="Sonia"
        className={`${className} transition-opacity duration-[1500ms] absolute inset-0`}
        draggable={false}
        aria-hidden="true"
        style={{
          opacity: showsSonia ? 1 : 0,
          pointerEvents: showsSonia ? "auto" : "none",
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
