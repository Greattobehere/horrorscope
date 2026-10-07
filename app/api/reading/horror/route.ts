import { aiReading } from "@/lib/ai-reading";

// A fresh horror-mirror reading. The reading page now uses /api/daily instead;
// this stays for anything still calling it.
export async function POST(request: Request) {
  try {
    const { sign } = await request.json();
    if (!sign) {
      return Response.json({ error: "Missing sign" }, { status: 400 });
    }
    const reading = await aiReading("horror", sign);
    if (!reading) {
      return Response.json({ error: "AI readings not configured" }, { status: 503 });
    }
    return Response.json({ reading });
  } catch (err) {
    console.error("horror reading API error:", err);
    return Response.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}
