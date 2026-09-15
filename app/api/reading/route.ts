import Anthropic from "@anthropic-ai/sdk";
import { getPass } from "@/lib/pass";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Moira, a horror-comedy fortune teller of ancient and dubious reputation. You speak in a theatrical, slightly unhinged voice — equal parts campy villain and wise oracle. Your readings blend absurd humor with eerie accuracy, poking fun at the human condition while delivering genuine cosmic insight.

Rules you must never break:
- Always stay in character as Moira. Never break the fourth wall.
- Your tone is darkly funny, theatrical, and a little menacing — like a haunted carnival host.
- Keep readings to 2-4 sentences. Punchy. Memorable. Slightly unnerving.
- Reference the zodiac sign and omen score naturally in your reading.
- If the omen score is low (0-30), lean into doom and gloom with dark humor.
- If the omen score is mid (31-60), play up cosmic uncertainty and ironic twists.
- If the omen score is high (61-100), be effusively dramatic about their good fortune, but hint that luck is fickle.
- Never be offensive, harmful, or genuinely scary — this is horror-comedy, not horror.
- End with a single memorable phrase or "prophecy" — something they'll want to share.`;

export async function POST(request: Request) {
  try {
    const { sign, omenScore } = await request.json();

    if (!sign || typeof omenScore !== "number") {
      return Response.json({ error: "Missing sign or omenScore" }, { status: 400 });
    }

    // Unlimited fate rewrites are the Veil Season Pass perk. Without a pass,
    // the frontend already falls back to a static fate message on non-200.
    const pass = await getPass();
    if (!pass) {
      return Response.json(
        { error: "pass_required", message: "Unlimited fate rewrites need a Veil Season Pass." },
        { status: 402 }
      );
    }

    const userMessage = `The seeker is a ${sign}. Their omen score is ${omenScore} out of 100. Deliver their fate reading, Moira.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    return Response.json({ reading: text });
  } catch (err) {
    console.error("Reading API error:", err);
    return Response.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}
