"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Witch = "moira" | "sonia";

interface TalkingWitchProps {
  who: Witch;
  text: string;
  disabled?: boolean;
  /** Spoken (and shown) before the reading, e.g. "Welcome, dear Leo..." */
  greeting?: string;
  /** Start talking on her own as soon as the reading is ready. */
  autoPlay?: boolean;
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

// How each voice is coloured in the browser. Moira copies the episodes: a softer,
// slightly muffled voice with a little room echo and faint wind underneath.
const SOUND: Record<Witch, { lowpass: number; gain: number; reverb: number; wind: number }> = {
  moira: { lowpass: 5200, gain: 0.85, reverb: 0.22, wind: 0.035 },
  sonia: { lowpass: 12000, gain: 1, reverb: 0.06, wind: 0 },
};

// Longest we wait for the voice service before using the browser's own voice.
const VOICE_TIMEOUT_MS = 35000;

async function fetchVoice(who: Witch, text: string): Promise<Blob> {
  const res = await fetch(`/api/voice?${new URLSearchParams({ who, text })}`);
  if (!res.ok) throw new Error(`voice ${res.status}`);
  return res.blob();
}

// A short decaying burst of noise: a cheap, natural-sounding reverb tail.
function impulse(ctx: AudioContext, seconds = 1.8) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

// Low, slowly swelling wind, like the room tone under the episodes.
function startWind(ctx: AudioContext, level: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 450;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.2);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const depth = ctx.createGain();
  depth.gain.value = level * 0.6;
  lfo.connect(depth).connect(gain.gain);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  lfo.start();
}

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

// Browsers only allow sound after the visitor has clicked or tapped the page.
const hasInteracted = () =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false;

export default function TalkingWitch({ who, text: reading, disabled = false, greeting = "", autoPlay = false }: TalkingWitchProps) {
  const layers = LAYERS[who];
  const text = reading ? (greeting ? `${greeting} ${reading}` : reading) : "";
  const autoPlayedRef = useRef("");
  const [waitingForTap, setWaitingForTap] = useState(false);
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
  const ctxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const prefetchRef = useRef<{ text: string; voice: Promise<Blob> } | null>(null);

  // Start making the voice as soon as the reading is final, so pressing the
  // button plays right away even when the voice service is slow.
  useEffect(() => {
    if (!text || disabled || prefetchRef.current?.text === text) return;
    const voice = fetchVoice(who, text);
    voice.catch(() => {}); // a failure is handled when the visitor presses play
    prefetchRef.current = { text, voice };
  }, [who, text, disabled]);

  const closeAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const stopMouth = useCallback(() => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    mouthTimer.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setMouth(0);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    closeAudio();
    stopMouth();
    setLoading(false);
    setSpeaking(false);
  }, [stopMouth, closeAudio]);

  // Stop talking if the text changes or the component goes away.
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    closeAudio();
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [text, closeAudio]);

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
    setLoading(true);
    // Create the audio context during the click itself; browsers keep one made
    // later (after the voice download) suspended, which silences the voice.
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), VOICE_TIMEOUT_MS);
    try {
      const prefetched = prefetchRef.current;
      const voice = prefetched && prefetched.text === text ? prefetched.voice : fetchVoice(who, text);
      const stopped = new Promise<never>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new Error("stopped"))),
      );
      const blob = await Promise.race([voice, stopped]);
      const url = URL.createObjectURL(blob);
      clearTimeout(timeout);
      if (abortRef.current !== controller) return; // stopped while loading
      abortRef.current = null;
      setLoading(false);
      const audio = new Audio(url);
      audioRef.current = audio;

      // Voice -> soften -> dry out + room echo. The mouth follows the dry voice.
      void ctx.resume(); // never await: without a real click it waits forever
      const sound = SOUND[who];
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      // The analyser must sit in the audio path or Chrome never feeds it samples.
      const source = ctx.createMediaElementSource(audio);
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = sound.lowpass;
      const level = ctx.createGain();
      level.gain.value = sound.gain;
      source.connect(analyser).connect(tone).connect(level).connect(ctx.destination);
      if (sound.reverb > 0) {
        const room = ctx.createConvolver();
        room.buffer = impulse(ctx);
        const wet = ctx.createGain();
        wet.gain.value = sound.reverb;
        level.connect(room).connect(wet).connect(ctx.destination);
      }
      if (sound.wind > 0) startWind(ctx, sound.wind);
      const samples = new Uint8Array(analyser.fftSize);
      // Scale the mouth to this voice's own loudness: Moira's breathy voice is
      // much quieter than Sonia's and barely opened her mouth on a fixed scale.
      let peak = 0.05;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / samples.length);
        peak = Math.max(rms, peak * 0.997);
        setMouth(Math.min(1, Math.max(0, (rms - 0.01) / (peak * 0.6))));
        frameRef.current = requestAnimationFrame(tick);
      };
      audio.onplay = () => tick();
      audio.onended = () => {
        stopMouth();
        setSpeaking(false);
        URL.revokeObjectURL(url);
        // Let the echo and wind fade out before closing.
        setTimeout(() => {
          if (ctxRef.current === ctx) ctxRef.current = null;
          ctx.close();
        }, 1500);
      };
      await audio.play();
    } catch (err) {
      clearTimeout(timeout);
      setLoading(false);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // The browser blocked sound before any tap: wait for one instead.
        closeAudio();
        stopMouth();
        setSpeaking(false);
        autoPlayedRef.current = "";
        setWaitingForTap(true);
        return;
      }
      // Don't reuse a failed or abandoned prefetch on the next press.
      if (prefetchRef.current?.text === text) prefetchRef.current = null;
      if (abortRef.current !== controller) return; // the visitor pressed Stop
      abortRef.current = null;
      if (ctxRef.current === ctx) ctxRef.current = null;
      ctx.close();
      // Voice service not configured, too slow, or unavailable: use the browser's voice.
      setSpeaking(false);
      if (supported) speakWithBrowser();
    }
  }, [text, who, supported, stopMouth, speakWithBrowser, closeAudio]);

  // Greet and read on her own once the reading is ready. Without an earlier tap
  // the browser would mute her, so then she starts on the visitor's first tap.
  useEffect(() => {
    if (!autoPlay || disabled || !text || autoPlayedRef.current === text) return;
    const start = () => {
      if (autoPlayedRef.current === text) return;
      autoPlayedRef.current = text;
      setWaitingForTap(false);
      void speak();
    };
    if (hasInteracted() && !waitingForTap) {
      const timer = setTimeout(start, 0); // after React's dev double-mount settles
      return () => clearTimeout(timer);
    }
    const onTap = (e: Event) => {
      // A tap on her own button is handled by the button itself.
      if ((e.target as Element | null)?.closest?.("[data-witch-button]")) {
        autoPlayedRef.current = text;
        setWaitingForTap(false);
        return;
      }
      start();
    };
    window.addEventListener("pointerup", onTap, { once: true });
    window.addEventListener("keydown", onTap, { once: true });
    const label = setTimeout(() => setWaitingForTap(true), 0);
    return () => {
      clearTimeout(label);
      window.removeEventListener("pointerup", onTap);
      window.removeEventListener("keydown", onTap);
    };
  }, [autoPlay, disabled, text, speak, waitingForTap]);

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
      {greeting && reading && (
        <p className="max-w-[300px] text-center italic text-[#D4C5F9]">&ldquo;{greeting}&rdquo;</p>
      )}
      {(
        <button
          data-witch-button
          onClick={speaking ? stop : speak}
          disabled={disabled || !text}
          className="px-5 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:opacity-40"
          style={{
            color: who === "moira" ? "#2EE59D" : "#E3B84B",
            border: `2px solid ${who === "moira" ? "#2EE59D" : "#E3B84B"}`,
          }}
          aria-label={speaking ? `Stop ${layers.name}` : `Hear ${layers.name} read your fortune`}
        >
          {loading
            ? `✦ Summoning ${layers.name}…`
            : speaking
              ? "■ Stop"
              : waitingForTap
                ? `▶ Tap to hear ${layers.name}`
                : `▶ Hear ${layers.name}`}
        </button>
      )}
    </div>
  );
}
