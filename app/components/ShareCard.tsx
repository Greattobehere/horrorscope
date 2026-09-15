"use client";

import React from "react";

interface ShareCardProps {
  signLabel: string;
  omenScore: number;
  quote: string;
}

export default function ShareCard({ signLabel, omenScore, quote }: ShareCardProps) {
  const isCheerful = omenScore >= 50;
  const portraitSrc = isCheerful ? "/assets/sonia.png" : "/assets/moira.png";
  const formLabel = isCheerful ? "Sonia" : "Moira";

  return (
    <div
      id="share-card"
      style={{
        width: "1200px",
        height: "630px",
        backgroundColor: "#0B0B14",
        border: "12px solid #E3B84B",
        borderRadius: "32px",
        padding: "36px",
        color: "#F2EEF7",
        boxSizing: "border-box",
        fontFamily: "Cinzel, serif",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: "#E3B84B", fontSize: "58px", margin: 0 }}>HorrorScope</h1>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#E3B84B", fontSize: "18px", fontWeight: "bold" }}>{signLabel}</div>
          <div style={{ color: "#D4C5F9", fontSize: "16px" }}>Omen Score: {omenScore}</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "28px",
          gap: "32px",
        }}
      >
        <img
          src={portraitSrc}
          alt={formLabel}
          style={{ width: "380px", height: "380px", objectFit: "cover", borderRadius: "24px", border: "4px solid #E3B84B" }}
        />

        <div style={{ flex: 1, marginLeft: "24px" }}>
          <p style={{ color: "#E3B84B", fontSize: "22px", marginBottom: "12px" }}>{formLabel}</p>
          <p style={{ fontSize: "44px", lineHeight: "1.1", fontWeight: "700", margin: 0, letterSpacing: "-1px" }}>
            {quote}
          </p>
        </div>
      </div>
    </div>
  );
}
