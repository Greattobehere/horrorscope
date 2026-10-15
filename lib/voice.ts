// Moira's and Sonia's voices: Kokoro text-to-speech hosted on fal.ai (FAL_KEY).
// Used by /api/voice (any text) and /api/daily-voice (the day's reading, made once).
import { Mp3Encoder } from "@breezystack/lamejs";

// Moira matches the Exit 41 videos: the same voice at the pace the episodes use
// for her "slow" lines (0.86 base x 0.88). Each sentence is spoken separately and
// joined with a natural pause (shorter after a short phrase, longer after a question
// or a trailing "..."), so neither witch rushes from one sentence to the next.
export const VOICES = {
  moira: { voice: "af_nicole", speed: 0.757, pauseSeconds: 0.75 },
  sonia: { voice: "af_aoede", speed: 0.8, pauseSeconds: 0.6 },
} as const;

/** Pause after a sentence: brief after a short phrase, longer after a question or "...". */
function pauseFor(sentence: string, base: number) {
  const s = sentence.trim();
  if (/(\?|\.\.\.|…)["'”’]?$/.test(s)) return base * 1.4;
  if (s.split(/\s+/).length <= 3) return base * 0.6;
  return base;
}

const MAX_SENTENCES = 12;
const SENTENCES_AT_ONCE = 6;

export const MAX_CHARS = 1100; // greeting + a short reading; this caps cost per request

function endpointFor(voice: string) {
  return voice.startsWith("b") ? "fal-ai/kokoro/british-english" : "fal-ai/kokoro/american-english";
}

// Only real sentence ends (next word capitalised), so "6 a.m. on" stays whole.
function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?…]["'”’]?)\s+(?=["'“‘]?[A-Z])/)
    .map((t) => t.trim())
    .filter(Boolean);
}

interface Pcm {
  format: Uint8Array; // the 16-byte "fmt " chunk body
  data: Uint8Array;
  bytesPerSecond: number;
  blockAlign: number;
}

// Pulls the raw samples out of a PCM WAV file.
function readWav(buf: ArrayBuffer): Pcm | null {
  const view = new DataView(buf);
  if (buf.byteLength < 12 || view.getUint32(0, false) !== 0x52494646 /* RIFF */) return null;
  let format: Uint8Array | null = null;
  let offset = 12;
  while (offset + 8 <= buf.byteLength) {
    const id = String.fromCharCode(...new Uint8Array(buf, offset, 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") format = new Uint8Array(buf.slice(offset + 8, offset + 8 + size));
    if (id === "data" && format) {
      const end = Math.min(buf.byteLength, offset + 8 + size);
      const fmt = new DataView(format.buffer);
      if (fmt.getUint16(0, true) !== 1) return null; // only plain PCM
      return {
        format,
        data: new Uint8Array(buf.slice(offset + 8, end)),
        bytesPerSecond: fmt.getUint32(8, true),
        blockAlign: fmt.getUint16(12, true),
      };
    }
    offset += 8 + size + (size & 1);
  }
  return null;
}

// Kokoro pads every clip with its own silence; cut it so the gaps we add are exact.
// The cut is gentle (a low threshold, room for breaths and the raspy tail of the last
// word) and each clip fades in and out over 20 ms, so no sentence starts or stops abruptly.
function trimSilence(p: Pcm): Pcm {
  const bitsPerSample = new DataView(p.format.buffer).getUint16(14, true);
  if (bitsPerSample !== 16) return p;
  const samples = new Int16Array(p.data.buffer, p.data.byteOffset, Math.floor(p.data.length / 2));
  const channels = p.blockAlign / 2;
  const loud = (i: number) => Math.abs(samples[i]) > 60;
  let start = 0;
  while (start < samples.length && !loud(start)) start++;
  let end = samples.length - 1;
  while (end > start && !loud(end)) end--;
  if (start >= end) return p;
  const rate = p.bytesPerSecond / p.blockAlign;
  const lead = Math.round(rate * 0.12) * channels;
  const tail = Math.round(rate * 0.28) * channels; // keep the breath after the last word
  const from = Math.max(0, start - lead) - (Math.max(0, start - lead) % channels);
  const to = Math.min(samples.length, end + tail);
  const data = p.data.slice(from * 2, to * 2);
  const out = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.length / 2));
  const fade = Math.min(Math.round(rate * 0.02) * channels, Math.floor(out.length / 2));
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] = Math.round(out[i] * g);
    out[out.length - 1 - i] = Math.round(out[out.length - 1 - i] * g);
  }
  return { ...p, data };
}

// Joins the sentences into one WAV with a pause after each one (pauses[i] seconds).
function joinWithSilence(parts: Pcm[], pauses: number[]): Uint8Array | null {
  const first = parts[0];
  const key = (p: Pcm) => Array.from(p.format.slice(0, 16)).join(",");
  if (parts.some((p) => key(p) !== key(first))) return null;
  const gaps = parts.map((_, i) =>
    i < parts.length - 1 ? Math.round((first.bytesPerSecond * pauses[i]) / first.blockAlign) * first.blockAlign : 0,
  );
  const dataLength = parts.reduce((n, p, i) => n + p.data.length + gaps[i], 0);
  const out = new Uint8Array(44 + dataLength);
  const view = new DataView(out.buffer);
  const ascii = (at: number, text: string) => [...text].forEach((c, i) => (out[at + i] = c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  out.set(first.format.slice(0, 16), 20);
  ascii(36, "data");
  view.setUint32(40, dataLength, true);
  let at = 44;
  parts.forEach((p, i) => {
    out.set(p.data, at);
    at += p.data.length + gaps[i]; // the gap is already zeros
  });
  return out;
}

/** fal's content filter refused the words (it won't voice talk of death, for one). */
export class VoiceRefused extends Error {}

const REFUSED = "refused";

async function speak(endpoint: string, key: string, voice: string, speed: number, text: string) {
  const url = await generate(endpoint, key, JSON.stringify({ prompt: text, voice, speed }));
  if (url === REFUSED) throw new VoiceRefused(text);
  if (!url) return null;
  const res = await fetch(url);
  return res.ok ? res.arrayBuffer() : null;
}

// fal usually answers in 1-2s, but a request now and then stalls in its queue.
// If one does, send one backup and take whichever finishes first.
const BACKUP_AFTER_MS = 3500;
const GIVE_UP_MS = 30000;

async function generate(endpoint: string, key: string, body: string): Promise<string | null> {
  const controllers: AbortController[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  try {
    return await new Promise<string | null>((resolve) => {
      let failures = 0;
      const attempt = () => {
        const controller = new AbortController();
        controllers.push(controller);
        fetch(`https://fal.run/${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        })
          .then(async (res) => {
            if (!res.ok) {
              const detail = await res.text();
              // Asking again won't help: the same words are refused every time.
              if (detail.includes("content_policy_violation")) return resolve(REFUSED);
              throw new Error(`fal ${res.status}: ${detail}`);
            }
            const { audio } = await res.json();
            resolve(audio.url as string);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            console.error("Voice API error:", err);
            if (++failures === 2) resolve(null);
          });
      };
      attempt();
      timers.push(setTimeout(attempt, BACKUP_AFTER_MS));
      timers.push(setTimeout(() => resolve(null), GIVE_UP_MS));
    });
  } finally {
    timers.forEach(clearTimeout);
    controllers.forEach((c) => c.abort());
  }
}

export type Witch = keyof typeof VOICES;

/**
 * Speaks `text` as WAV bytes with a real pause after each sentence, or null if fal
 * fails. Throws VoiceRefused when fal's content filter won't voice the words.
 */
export async function synthesize(who: Witch, text: string): Promise<ArrayBuffer | Uint8Array | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  const config = VOICES[who];
  const endpoint = endpointFor(config.voice);
  // fal's content filter is inconsistent: words refused once often pass on a retry.
  const say = async (t: string) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await speak(endpoint, key, config.voice, config.speed, t);
      } catch (err) {
        if (!(err instanceof VoiceRefused) || attempt === 3) throw err;
      }
    }
  };

  // Every sentence at once (no slower than one request), then stitched together
  // with pauses. A sentence the filter keeps refusing is left out rather than
  // losing the whole reading. If anything else goes wrong, speak it in one go.
  const started = Date.now();
  const sentences = splitSentences(text);
  if (sentences.length > 1 && sentences.length <= MAX_SENTENCES) {
    let refused = 0;
    // fal allows 20 requests at once across the whole account, so a few sentences at a
    // time (the nightly warm-up voices several readings back to back).
    const sayOrSkip = (t: string) =>
      say(t).catch((err) => {
        if (!(err instanceof VoiceRefused)) throw err;
        refused++;
        return "skip" as const;
      });
    const clips: Awaited<ReturnType<typeof sayOrSkip>>[] = [];
    for (let i = 0; i < sentences.length; i += SENTENCES_AT_ONCE) {
      clips.push(...(await Promise.all(sentences.slice(i, i + SENTENCES_AT_ONCE).map(sayOrSkip))));
    }
    if (refused === sentences.length) throw new VoiceRefused(text);
    const keptAt = clips.flatMap((c, i) => (c !== "skip" ? [i] : []));
    const pcm = keptAt.map((i) => { const c = clips[i]; return c && c !== "skip" ? readWav(c) : null; });
    if (pcm.every((p): p is Pcm => p !== null)) {
      if (refused) console.warn(`Voice: left out ${refused} refused sentence(s) of:`, text);
      const pauses = keptAt.map((i) => pauseFor(sentences[i], config.pauseSeconds));
      const joined = joinWithSilence(pcm.map(trimSilence), pauses);
      if (joined) return joined;
    }
  }
  return Date.now() - started < 20000 ? say(text) : null;
}

/** fal can take 30s to answer the first request after a quiet spell; this wakes it. */
export async function wakeVoice() {
  const key = process.env.FAL_KEY;
  if (!key) return;
  const fresh = `Hi ${Date.now() % 1000}.`; // unique, so fal really runs it
  await generate(endpointFor(VOICES.sonia.voice), key, JSON.stringify({ prompt: fresh, voice: VOICES.sonia.voice }));
}

/**
 * WAV -> MP3 (64 kbps mono): about 6x smaller, so a reading starts playing quickly on a
 * phone connection. Returns null if the audio isn't plain 16-bit PCM (send the WAV then).
 */
export function toMp3(wav: ArrayBuffer | Uint8Array): Uint8Array | null {
  const bytes = wav instanceof Uint8Array ? wav : new Uint8Array(wav);
  const pcm = readWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  if (!pcm) return null;
  const fmt = new DataView(pcm.format.buffer);
  const channels = fmt.getUint16(2, true);
  const rate = fmt.getUint32(4, true);
  if (fmt.getUint16(14, true) !== 16 || channels !== 1) return null;
  const samples = new Int16Array(pcm.data.buffer, pcm.data.byteOffset, Math.floor(pcm.data.length / 2));
  const encoder = new Mp3Encoder(1, rate, 64);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (out.length) chunks.push(new Uint8Array(out));
  }
  chunks.push(new Uint8Array(encoder.flush()));
  const mp3 = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) { mp3.set(c, at); at += c.length; }
  return mp3;
}

/** The audio to send: MP3 when it encodes cleanly, otherwise the original WAV. */
export function forBrowser(audio: ArrayBuffer | Uint8Array): { body: Uint8Array | ArrayBuffer; type: string } {
  try {
    const mp3 = toMp3(audio);
    if (mp3 && mp3.length > 1000) return { body: mp3, type: "audio/mpeg" };
  } catch (err) {
    console.error("MP3 encode failed, sending WAV:", err);
  }
  return { body: audio, type: "audio/wav" };
}
