import { SIGNS, todayKey } from "@/lib/daily";

// Run nightly by Vercel Cron (vercel.json) just after midnight at Exit 41: writes and
// voices every sign's readings for the day, so the first visitor never waits.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const date = todayKey();
  const jobs = SIGNS.flatMap((sign) =>
    (["sonia", "moira"] as const).map((who) => `${origin}/api/daily-voice/${who}/${sign}/${date}`),
  );
  const results: Record<string, number> = {};
  // A few at a time, to stay well inside the voice service's limits.
  for (let i = 0; i < jobs.length; i += 3) {
    await Promise.all(
      jobs.slice(i, i + 3).map(async (url) => {
        const kind = url.includes("/sonia/") ? "brightside" : "horror";
        const [sign] = url.split("/").slice(-2);
        await fetch(`${origin}/api/daily/${kind}/${sign}/${date}`).catch(() => null);
        const res = await fetch(url).catch(() => null);
        results[url.replace(origin, "")] = res?.status ?? 0;
      }),
    );
  }
  return Response.json({ date, results });
}
