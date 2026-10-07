import { dailyReading, forgetReading, validRequest } from "@/lib/daily";
import { VoiceRefused, synthesize } from "@/lib/voice";

// GET /api/daily-voice/sonia/leo/2026-10-07 -> the day's reading in her voice (WAV).
// Voiced once per sign per day and then served from Vercel's cache, so visitors
// never wait for the voice service.
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 172800;
export const maxDuration = 60;
export function generateStaticParams() {
  return [];
}

const KIND = { sonia: "brightside", moira: "horror" } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ who: string; sign: string; date: string }> }) {
  const { who, sign, date } = await params;
  const kind = KIND[who as keyof typeof KIND];
  if (!kind || !validRequest(kind, sign, date)) {
    return Response.json({ error: "Unknown reading" }, { status: 404 });
  }
  const { text, cached } = await dailyReading(kind, sign, date);
  // Errors are thrown, never returned, so a failure is never cached for the day.
  if (!cached) throw new Error("AI reading unavailable");
  let audio;
  try {
    audio = await synthesize(who as keyof typeof KIND, text);
  } catch (err) {
    // A reading stored before refused readings were caught: write a new one.
    if (err instanceof VoiceRefused) forgetReading(kind, sign, date);
    throw err;
  }
  if (!audio) throw new Error("Voice generation failed");
  return new Response(audio as BodyInit, {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "public, max-age=3600, s-maxage=172800" },
  });
}
