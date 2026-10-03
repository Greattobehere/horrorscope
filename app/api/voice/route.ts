// Speaks a reading in Moira's or Sonia's voice (Kokoro TTS hosted on fal.ai).
// Returns the audio bytes from our own origin so the browser can analyse the
// waveform to drive the talking portrait's mouth. Without FAL_KEY this returns
// 503 and the client falls back to the browser's built-in speech.

const VOICES = {
  moira: { voice: "bf_emma", speed: 0.9 },
  sonia: { voice: "af_heart", speed: 1.0 },
} as const;

const MAX_CHARS = 800; // a reading is 2-4 sentences; this caps cost per request

function endpointFor(voice: string) {
  return voice.startsWith("b") ? "fal-ai/kokoro/british-english" : "fal-ai/kokoro/american-english";
}

export async function POST(request: Request) {
  const key = process.env.FAL_KEY;
  if (!key) {
    return Response.json({ error: "Voice not configured" }, { status: 503 });
  }

  try {
    const { who, text } = await request.json();
    const config = VOICES[who as keyof typeof VOICES];
    if (!config || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "Missing voice or text" }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json({ error: "Text too long" }, { status: 413 });
    }

    const res = await fetch(`https://fal.run/${endpointFor(config.voice)}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text, voice: config.voice, speed: config.speed }),
    });
    if (!res.ok) {
      console.error("Voice API error:", res.status, await res.text());
      return Response.json({ error: "Voice generation failed" }, { status: 502 });
    }
    const { audio } = await res.json();
    const file = await fetch(audio.url);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.headers.get("content-type") ?? "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Voice API error:", err);
    return Response.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
