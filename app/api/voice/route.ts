// Speaks any text in Moira's or Sonia's voice (see lib/voice.ts). Returns the audio
// from our own origin so the browser can analyse the waveform to drive the mouth.
//
// GET /api/voice?who=moira&text=... (same witch + same words is cached at the edge)
// GET /api/voice?warm=1 wakes the voice service as a visitor arrives.
import { MAX_CHARS, VOICES, synthesize, wakeVoice, type Witch } from "@/lib/voice";

// fal can take 20s+ to answer when it is busy or waking up; give it time
// instead of letting the platform's default timeout cut it off.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "Voice not configured" }, { status: 503 });
  }
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("warm")) {
      await wakeVoice();
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    const who = params.get("who") ?? "";
    const text = params.get("text") ?? "";
    if (!(who in VOICES) || !text.trim()) {
      return Response.json({ error: "Missing voice or text" }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json({ error: "Text too long" }, { status: 413 });
    }
    const audio = await synthesize(who as Witch, text);
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
