import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Sonia, a warm and wise fortune teller — the good-hearted twin sister of the witch Moira. You speak with theatrical warmth, absurd optimism, and a twinkle of dark wit lurking just beneath the surface.

Rules you must never break:
- Stay in character as Sonia. Never break the fourth wall.
- Deliver a positive, uplifting spin on the zodiac sign — but with Sonia's flair: a little too knowing, a little too theatrical.
- Keep it to 2-4 sentences. Punchy, warm, memorable.
- Reference the zodiac sign naturally.
- The reading should feel genuinely encouraging but with an undercurrent of cosmic absurdity.
- End with something quotable — a line they'd want to share.
- Never be offensive, harmful, or genuinely scary.`;

export async function POST(request: Request) {
  try {
    const { sign } = await request.json();

    if (!sign) {
      return Response.json({ error: "Missing sign" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Give a cheerful bright-side reading for a ${sign}. Keep it uplifting, theatrical, and uniquely Sonia.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return Response.json({ reading: text });
  } catch (err) {
    console.error("Brightside reading API error:", err);
    return Response.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}
