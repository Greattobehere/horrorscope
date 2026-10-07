import { unstable_cache } from "next/cache";
import { aiReading, type ReadingKind } from "@/lib/ai-reading";
import { READINGS } from "@/app/data/readings";

// One reading per sign per day, like a newspaper horoscope. Each is written once,
// kept in Vercel's data cache, and voiced once (/api/daily-voice), so visitors get
// it instantly. A nightly cron (/api/daily/warm) prepares all of them in advance.

export const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

export const KINDS: ReadingKind[] = ["brightside", "horror"];

/** Today's date at Exit 41 (Montana), YYYY-MM-DD. The client uses the same rule. */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(now);
}

/** Only today, yesterday and tomorrow, so nobody can make us write readings for any date. */
export function validRequest(kind: string, sign: string, date: string) {
  if (!KINDS.includes(kind as ReadingKind) || !SIGNS.includes(sign as (typeof SIGNS)[number])) return false;
  const day = 86400000;
  const now = Date.now();
  return [now - day, now, now + day].some((t) => todayKey(new Date(t)) === date);
}

// The pre-written reading for that sign and date: the fallback when the AI can't answer.
function writtenReading(kind: ReadingKind, sign: string, date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
  const set = READINGS[sign] ?? READINGS.scorpio;
  const list = kind === "brightside" ? set.brightSide : set.horrorMirror;
  return list[dayOfYear % list.length];
}

// Throwing keeps a failed AI call out of the cache, so the next request tries again.
const cachedAiReading = unstable_cache(
  async (kind: ReadingKind, sign: string, date: string) => {
    const text = await aiReading(kind, sign);
    if (!text) throw new Error(`no AI reading for ${kind}/${sign}/${date}`);
    return text;
  },
  ["daily-reading-v1"],
  { revalidate: 3 * 86400 },
);

/** The day's reading for a sign: the AI one if it can be written, else the pre-written one. */
export async function dailyReading(kind: ReadingKind, sign: string, date: string) {
  try {
    return { text: await cachedAiReading(kind, sign, date), cached: true };
  } catch (err) {
    if (process.env.ANTHROPIC_API_KEY) console.error("Daily reading error:", err);
    return { text: writtenReading(kind, sign, date), cached: !process.env.ANTHROPIC_API_KEY };
  }
}
