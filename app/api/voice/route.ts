// Speaks a reading in Moira's or Sonia's voice (Kokoro TTS hosted on fal.ai).
// Returns the audio bytes from our own origin so the browser can analyse the
// waveform to drive the talking portrait's mouth. Without FAL_KEY this returns
// 503 and the client falls back to the browser's built-in speech.
//
// GET /api/voice?who=moira&text=... so identical readings (the pre-written
// ones repeat for everyone with the same sign that day) are served from
// Vercel's cache instead of being generated again.

// Moira matches the Exit 41 videos: the same voice at the pace the episodes use
// for her "slow" lines (0.86 base x 0.88). Each sentence is spoken separately and
// joined with real silence, so neither witch rushes from one sentence to the next.
const VOICES = {
  moira: { voice: "af_nicole", speed: 0.757, pauseSeconds: 1.15 },
  sonia: { voice: "af_aoede", speed: 0.8, pauseSeconds: 0.85 },
} as const;

const MAX_SENTENCES = 12;

const MAX_CHARS = 1100; // greeting + a 2-4 sentence reading; this caps cost per request

// fal can take 20s+ to answer when it is busy or waking up; give it time
// instead of letting the platform's default timeout cut it off.
export const maxDuration = 60;

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
function trimSilence(p: Pcm): Pcm {
  const bitsPerSample = new DataView(p.format.buffer).getUint16(14, true);
  if (bitsPerSample !== 16) return p;
  const samples = new Int16Array(p.data.buffer, p.data.byteOffset, Math.floor(p.data.length / 2));
  const channels = p.blockAlign / 2;
  const loud = (i: number) => Math.abs(samples[i]) > 300;
  let start = 0;
  while (start < samples.length && !loud(start)) start++;
  let end = samples.length - 1;
  while (end > start && !loud(end)) end--;
  if (start >= end) return p;
  const pad = Math.round((p.bytesPerSecond / p.blockAlign) * 0.06) * channels; // keep a breath of tail
  const from = Math.max(0, start - pad) - (Math.max(0, start - pad) % channels);
  const to = Math.min(samples.length, end + pad);
  return { ...p, data: p.data.slice(from * 2, to * 2) };
}

// Joins the sentences into one WAV with a silent gap after each one.
function joinWithSilence(parts: Pcm[], pauseSeconds: number): Uint8Array | null {
  const first = parts[0];
  const key = (p: Pcm) => Array.from(p.format.slice(0, 16)).join(",");
  if (parts.some((p) => key(p) !== key(first))) return null;
  const gap = Math.round((first.bytesPerSecond * pauseSeconds) / first.blockAlign) * first.blockAlign;
  const dataLength = parts.reduce((n, p) => n + p.data.length, 0) + gap * (parts.length - 1);
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
    at += p.data.length + (i < parts.length - 1 ? gap : 0); // the gap is already zeros
  });
  return out;
}

async function speak(endpoint: string, key: string, voice: string, speed: number, text: string) {
  const url = await generate(endpoint, key, JSON.stringify({ prompt: text, voice, speed }));
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
            if (!res.ok) throw new Error(`fal ${res.status}: ${await res.text()}`);
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

export async function GET(request: Request) {
  const key = process.env.FAL_KEY;
  if (!key) {
    return Response.json({ error: "Voice not configured" }, { status: 503 });
  }

  try {
    const params = new URL(request.url).searchParams;
    // fal can take 30s to answer the first request after a quiet spell. The pages
    // send a tiny ?warm request as the visitor arrives so it's awake by the reading.
    if (params.has("warm")) {
      const fresh = `Hi ${Date.now() % 1000}.`; // unique, so fal really runs it
      await generate(endpointFor(VOICES.sonia.voice), key, JSON.stringify({ prompt: fresh, voice: VOICES.sonia.voice }));
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    const who = params.get("who") ?? "";
    const text = params.get("text") ?? "";
    const config = VOICES[who as keyof typeof VOICES];
    if (!config || !text.trim()) {
      return Response.json({ error: "Missing voice or text" }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json({ error: "Text too long" }, { status: 413 });
    }

    const endpoint = endpointFor(config.voice);
    const say = (t: string) => speak(endpoint, key, config.voice, config.speed, t);

    // Every sentence at once (no slower than one request), then stitched together
    // with pauses. If anything about that goes wrong, speak the text in one go.
    let audio: ArrayBuffer | Uint8Array | null = null;
    const started = Date.now();
    const sentences = splitSentences(text);
    if (sentences.length > 1 && sentences.length <= MAX_SENTENCES) {
      const clips = await Promise.all(sentences.map(say));
      const pcm = clips.map((c) => (c ? readWav(c) : null));
      if (pcm.every((p): p is Pcm => p !== null)) audio = joinWithSilence(pcm.map(trimSilence), config.pauseSeconds);
    }
    // Only retry in one go if there's still time; past that the page uses its own voice.
    if (!audio && Date.now() - started < 20000) audio = await say(text);
    if (!audio) {
      return Response.json({ error: "Voice generation failed" }, { status: 502 });
    }
    return new Response(audio as BodyInit, {
      headers: {
        "Content-Type": "audio/wav",
        // Same witch + same words = same audio, so let Vercel's edge keep it.
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (err) {
    console.error("Voice API error:", err);
    return Response.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
