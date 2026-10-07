import { dailyReading, validRequest } from "@/lib/daily";
import type { ReadingKind } from "@/lib/ai-reading";

// GET /api/daily/brightside/leo/2026-10-07 -> { reading }. Written once per sign per
// day and then served from Vercel's cache.
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 172800;
export function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; sign: string; date: string }> }) {
  const { kind, sign, date } = await params;
  if (!validRequest(kind, sign, date)) {
    return Response.json({ error: "Unknown reading" }, { status: 404 });
  }
  const { text, cached } = await dailyReading(kind as ReadingKind, sign, date);
  // A stand-in reading (the AI was down) must not be cached for the whole day.
  if (!cached) throw new Error("AI reading unavailable; not caching the stand-in");
  return Response.json({ reading: text });
}
