"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Witch = "moira" | "sonia";

interface TalkingWitchProps {
  who: Witch;
  text: string;
  disabled?: boolean;
}

// Layered portrait: base image, plus a mouth-open patch and an eyes-closed patch
// that are faded in on top. Nothing outside the mouth and eyes ever moves.
const LAYERS: Record<Witch, { base: string; mouth: string; blink: string; name: string }> = {
  moira: {
    base: "/assets/talking/moira/base.webp",
    mouth: "/assets/talking/moira/mouth.webp",
    blink: "/assets/talking/moira/blink.webp",
    name: "Moira",
  },
  sonia: {
    base: "/assets/talking/sonia/base.webp",
    mouth: "/assets/talking/sonia/mouth.webp",
    blink: "/assets/talking/sonia/blink.webp",
    name: "Sonia",
  },
};

// Moira is slower and lower; Sonia is lighter and warmer.
const DELIVERY: Record<Witch, { pitch: number; rate: number }> = {
  moira: { pitch: 0.75, rate: 0.88 },
  sonia: { pitch: 1.1, rate: 0.96 },
};

const noopSubscribe = () => () => {};

// Fallback only: the browser's own voices, preferring women's voices.
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const preferred = [/female/i, /Zira|Hazel|Susan|Libby|Sonia|Serena|Kate|Fiona|Samantha|Karen|Moira|Tessa|Victoria|Aria|Jenny/i];
  for (const pattern of preferred) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return voices.find((v) => !/David|Mark|George|Guy|Daniel|Alex|Fred/i.test(v.name)) ?? voices[0];
}

export default function TalkingWitch({ who, text, disabled = false }: TalkingWitchProps) {
  const layers = LAYERS[who];
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, () => "speechSynthesis" in window, () => false);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Idle blinking, every few seconds.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2500 + Math.random() * 3500);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopMouth = useCallback(() => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    mouthTimer.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setMouth(0);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    stopMouth();
    setSpeaking(false);
  }, [stopMouth]);

  // Stop talking if the text changes or the component goes away.
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [text]);

  const speakWithBrowser = useCallback(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.pitch = DELIVERY[who].pitch;
    utterance.rate = DELIVERY[who].rate;
    utterance.onstart = () => {
      setSpeaking(true);
      mouthTimer.current = setInterval(() => setMouth(0.25 + Math.random() * 0.75), 110);
    };
    utterance.onboundary = () => setMouth(1);
    utterance.onend = () => {
      stopMouth();
      setSpeaking(false);
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }, [text, who, stopMouth]);

  const speak = useCallback(async () => {
    if (!text) return;
    setSpeaking(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who, text }),
      });
      if (!res.ok) throw new Error(`voice ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;

      // Drive the mouth from the loudness of the actual speech.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / samples.length);
        setMouth(Math.min(1, Math.max(0, (rms - 0.015) * 9)));
        frameRef.current = requestAnimationFrame(tick);
      };
      audio.onplay = () => tick();
      audio.onended = () => {
        stopMouth();
        setSpeaking(false);
        URL.revokeObjectURL(url);
        ctx.close();
      };
      await audio.play();
    } catch {
      // Voice service not configured or unavailable: use the browser's voice.
      setSpeaking(false);
      if (supported) speakWithBrowser();
    }
  }, [text, who, supported, stopMouth, speakWithBrowser]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[280px] aspect-[4/5] overflow-hidden rounded-lg">
        <img src={layers.base} alt={layers.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <img
          src={layers.mouth}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-75"
          style={{ opacity: mouth }}
          draggable={false}
        />
        <img
          src={layers.blink}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: blink ? 1 : 0 }}
          draggable={false}
        />
      </div>
      {(
        <button
          onClick={speaking ? stop : speak}
          disabled={disabled || !text}
          className="px-5 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:opacity-40"
          style={{
            color: who === "moira" ? "#2EE59D" : "#E3B84B",
            border: `2px solid ${who === "moira" ? "#2EE59D" : "#E3B84B"}`,
          }}
          aria-label={speaking ? `Stop ${layers.name}` : `Hear ${layers.name} read your fortune`}
        >
          {speaking ? "■ Stop" : `▶ Hear ${layers.name}`}
        </button>
      )}
    </div>
  );
}
