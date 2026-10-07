"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Witch = "moira" | "sonia";

interface TalkingWitchProps {
  who: Witch;
  text: string;
  /** True while the reading is still being written. */
  disabled?: boolean;
  /** Spoken (and shown) before the reading, e.g. "Welcome, dear Leo..." */
  greeting?: string;
  /** Pre-recorded greeting, so she starts talking before the reading is written. */
  greetingAudio?: string;
  /** Where the reading's voice comes from; defaults to voicing `text` on demand. */
  voiceUrl?: string;
  /** Start talking on her own. */
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

// How each voice is coloured in the browser. Moira is left clean so she sounds
// exactly like the Exit 41 videos (no muffling, echo or wind under her).
const SOUND: Record<Witch, { lowpass: number; gain: number; reverb: number; wind: number }> = {
  moira: { lowpass: 12000, gain: 1, reverb: 0, wind: 0 },
  sonia: { lowpass: 12000, gain: 1, reverb: 0.06, wind: 0 },
};

// Longest she waits for the reading's voice. There is no robot-voice fallback:
// if it never comes she simply goes quiet and the button lets the visitor retry.
const VOICE_TIMEOUT_MS = 45000;

// One request per voice URL, shared by the page's early prefetch and the portrait
// itself. A failed request is forgotten so the next try starts fresh.
const voices = new Map<string, Promise<Blob>>();

export function voiceUrlFor(who: Witch, text: string) {
  return `/api/voice?${new URLSearchParams({ who, text })}`;
}

export function prefetchVoice(url: string): Promise<Blob> {
  let voice = voices.get(url);
  if (!voice) {
    voice = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`voice ${res.status}`);
      return res.blob();
    });
    voice.catch(() => voices.delete(url));
    voices.set(url, voice);
  }
  return voice;
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


// Browsers only allow sound after the visitor has clicked or tapped the page.
const hasInteracted = () =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false;

interface Session {
  ctx: AudioContext;
  audio: HTMLAudioElement;
  stopped: boolean;
  frame: number | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function TalkingWitch({
  who,
  text: reading,
  disabled = false,
  greeting = "",
  greetingAudio = "",
  voiceUrl = "",
  autoPlay = false,
}: TalkingWitchProps) {
  const layers = LAYERS[who];
  // With a recorded greeting the voice service only has to make the reading;
  // without one, she says the greeting as part of the reading.
  const spoken = reading ? (greeting && !greetingAudio ? `${greeting} ${reading}` : reading) : "";
  const readingReady = !disabled && !!spoken;
  const readingUrl = voiceUrl || (spoken ? voiceUrlFor(who, spoken) : "");
  const canStart = readingReady || !!greetingAudio;

  const [status, setStatus] = useState<"idle" | "loading" | "speaking">("idle");
  const [waitingForTap, setWaitingForTap] = useState(false);
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const greetingRef = useRef<Promise<Blob | null> | null>(null);
  const voiceRef = useRef<string>("");
  const startedRef = useRef(false);

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

  // Download the recorded greeting straight away; it's a small file.
  useEffect(() => {
    greetingRef.current = greetingAudio
      ? fetch(greetingAudio)
          .then((r) => (r.ok ? r.blob() : null))
          .catch(() => null)
      : null;
  }, [greetingAudio]);

  // Start making the reading's voice the moment the reading is final, so it's
  // ready by the time she finishes saying hello.
  useEffect(() => {
    if (!readingReady || !readingUrl) return;
    prefetchVoice(readingUrl).catch(() => {}); // handled when it's her turn to read
    voiceRef.current = readingUrl;
  }, [readingUrl, readingReady]);

  const stopMouth = useCallback(() => setMouth(0), []);

  const endSession = useCallback((session: Session | null) => {
    if (!session || session.stopped) return;
    session.stopped = true;
    if (session.frame) cancelAnimationFrame(session.frame);
    session.audio.pause();
    const ctx = session.ctx;
    setTimeout(() => ctx.close(), 1500); // let any echo fade out
    if (sessionRef.current === session) sessionRef.current = null;
  }, []);

  // One audio element and one sound chain per performance; the mouth follows it.
  const startSession = useCallback((): Session => {
    const ctx = new AudioContext(); // made during the tap, or browsers keep it muted
    void ctx.resume(); // never await: without a real tap it waits forever
    const audio = new Audio();
    const session: Session = { ctx, audio, stopped: false, frame: null };
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
    // Scale the mouth to this voice's own loudness: Moira's voice is quieter.
    let peak = 0.05;
    let open = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / samples.length);
      peak = Math.max(rms, peak * 0.997);
      const target = rms < 0.015 ? 0 : Math.min(1, Math.max(0, (rms - 0.01) / (peak * 0.6)));
      // Open quickly on a syllable, close a touch slower: reads as speech, not flicker.
      open = target > open ? open + (target - open) * 0.6 : open + (target - open) * 0.35;
      setMouth(open < 0.04 ? 0 : open);
      session.frame = requestAnimationFrame(tick);
    };
    session.frame = requestAnimationFrame(tick);
    return session;
  }, [who]);

  const speak = useCallback(async () => {
    if (!canStart) return;
    endSession(sessionRef.current);
    const session = startSession();
    sessionRef.current = session;

    const play = (blob: Blob) =>
      new Promise<void>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const done = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        session.audio.onended = done;
        session.audio.onpause = () => {
          if (session.stopped) done();
        };
        session.audio.src = url;
        session.audio.play().catch((err) => {
          URL.revokeObjectURL(url);
          reject(err);
        });
      });

    // Waits for the reading to be written and voiced, asking again if a request
    // fails, until the timeout.
    const readingVoice = async (): Promise<Blob | null> => {
      const deadline = Date.now() + VOICE_TIMEOUT_MS;
      while (Date.now() < deadline && !session.stopped) {
        const url = voiceRef.current;
        if (!url) {
          await sleep(150);
          continue;
        }
        const left = Math.max(1000, deadline - Date.now());
        const blob = await Promise.race([prefetchVoice(url), sleep(left).then(() => null)]).catch(() => null);
        if (blob) return blob;
        await sleep(1500); // the failed request was forgotten; the next loop asks again
      }
      return null;
    };

    try {
      // 1. Hello, from the recording, while her reading is still being voiced.
      const hello = greetingRef.current
        ? await Promise.race([greetingRef.current, sleep(4000).then(() => null)])
        : null;
      if (session.stopped) return;
      if (hello) {
        setStatus("speaking");
        await play(hello);
        if (session.stopped) return;
        await sleep(450);
      }
      // 2. The reading.
      setStatus("loading");
      const voice = await readingVoice();
      if (session.stopped) return;
      if (voice) {
        setStatus("speaking");
        await play(voice);
        endSession(session);
        stopMouth();
        setStatus("idle");
        return;
      }
      // The voice never came: go quiet rather than use a robotic voice.
      endSession(session);
      stopMouth();
      setStatus("idle");
    } catch (err) {
      endSession(session);
      stopMouth();
      setStatus("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        startedRef.current = false; // the browser blocked sound: wait for a tap
        setWaitingForTap(true);
      }
    }
  }, [canStart, startSession, endSession, stopMouth]);

  const stop = useCallback(() => {
    endSession(sessionRef.current);
    stopMouth();
    setStatus("idle");
  }, [endSession, stopMouth]);

  // Stop talking when she leaves the page.
  useEffect(
    () => () => endSession(sessionRef.current),
    [endSession],
  );

  // Greet and read on her own. Without an earlier tap the browser would mute
  // her, so then she starts on the visitor's first tap anywhere on the page.
  useEffect(() => {
    if (!autoPlay || !canStart || startedRef.current) return;
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setWaitingForTap(false);
      void speak();
    };
    if (hasInteracted() && !waitingForTap) {
      const timer = setTimeout(start, 0); // after React's dev double-mount settles
      return () => clearTimeout(timer);
    }
    const onTap = (e: Event) => {
      // A tap on her own button is handled by the button itself.
      if ((e.target as Element | null)?.closest?.("[data-witch-button]")) return;
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
  }, [autoPlay, canStart, speak, waitingForTap]);

  const onButton = () => {
    if (status !== "idle") return stop();
    startedRef.current = true;
    setWaitingForTap(false);
    void speak();
  };

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
      {greeting && <p className="max-w-[300px] text-center italic text-[#D4C5F9]">&ldquo;{greeting}&rdquo;</p>}
      <button
        data-witch-button
        onClick={onButton}
        disabled={!canStart}
        className="px-5 py-2 rounded-lg font-semibold hover:opacity-80 transition disabled:opacity-40"
        style={{
          color: who === "moira" ? "#2EE59D" : "#E3B84B",
          border: `2px solid ${who === "moira" ? "#2EE59D" : "#E3B84B"}`,
        }}
        aria-label={status === "idle" ? `Hear ${layers.name} read your fortune` : `Stop ${layers.name}`}
      >
        {status === "loading"
          ? `✦ ${layers.name} is reading your stars…`
          : status === "speaking"
            ? "■ Stop"
            : waitingForTap
              ? `▶ Tap to hear ${layers.name}`
              : `▶ Hear ${layers.name}`}
      </button>
    </div>
  );
}
