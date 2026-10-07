// Speaks a reading in Moira's or Sonia's voice (Kokoro TTS hosted on fal.ai).
// Returns the audio bytes from our own origin so the browser can analyse the
// waveform to drive the talking portrait's mouth. Without FAL_KEY this returns
// 503 and the client falls back to the browser's built-in speech.
//
// GET /api/voice?who=moira&text=... so identical readings (the pre-written
// ones repeat for everyone with the same sign that day) are served from
// Vercel's cache instead of being generated again.

// Moira matches the Exit 41 videos: the same voice at the pace the episodes use
// (0.86 base x 0.88 "slow" delivery), with a breath between sentences.
const VOICES = {
  moira: { voice: "af_nicole", speed: 0.76, pauses: true },
  sonia: { voice: "af_aoede", speed: 0.95, pauses: false },
} as const;

const MAX_CHARS = 1100; // greeting + a 2-4 sentence reading; this caps cost per request

// fal can take 20s+ to answer when it is busy or waking up; give it time
// instead of letting the platform's default timeout cut it off.
export const maxDuration = 60;

function endpointFor(voice: string) {
  return voice.startsWith("b") ? "fal-ai/kokoro/british-english" : "fal-ai/kokoro/american-english";
}

// Kokoro pauses longer at an ellipsis, which gives Moira her slow, hanging delivery.
// Only real sentence ends (next word capitalised), so "6 a.m. on" is left alone.
function withPauses(text: string) {
  return text.replace(/(?<!\.)\.\s+(?=["'“‘]?[A-Z])/g, "... ");
}

// fal usually answers in 1-2s, but a request now and then stalls in its queue.
// If one does, send one backup and take whichever finishes first.
const BACKUP_AFTER_MS = 6000;
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
    const who = params.get("who") ?? "";
    const text = params.get("text") ?? "";
    const config = VOICES[who as keyof typeof VOICES];
    if (!config || !text.trim()) {
      return Response.json({ error: "Missing voice or text" }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json({ error: "Text too long" }, { status: 413 });
    }

    const body = JSON.stringify({
      prompt: config.pauses ? withPauses(text) : text,
      voice: config.voice,
      speed: config.speed,
    });
    const audioUrl = await generate(endpointFor(config.voice), key, body);
    if (!audioUrl) {
      return Response.json({ error: "Voice generation failed" }, { status: 502 });
    }
    const file = await fetch(audioUrl);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.headers.get("content-type") ?? "audio/wav",
        // Same witch + same words = same audio, so let Vercel's edge keep it.
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (err) {
    console.error("Voice API error:", err);
    return Response.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
