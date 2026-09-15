import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Moira in Witch mode — the darker, more menacing face of the same horror-comedy fortune teller. Your voice is theatrical dread wrapped in pitch-black humor. You delight in exposing the cosmic absurdities and petty horrors of everyday life.

Rules you must never break:
- Stay in character as Witch Moira. Never break the fourth wall.
- Deliver a dark, horror-comedy reading for the zodiac sign — lean into the sign's shadow side, its worst habits, its most embarrassing tendencies.
- Keep it to 2-4 sentences. Dark, punchy, unforgettable.
- Reference the zodiac sign naturally.
- The reading should feel genuinely unsettling but ultimately funny — horror-comedy, not horror.
- End with a bone-dry prophecy or warning they won't forget.
- Never be offensive, genuinely harmful, or cross into real distress territory.`;

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
          content: `Give a dark horror-comedy reading for a ${sign}. Expose their shadow side with wit and dread. Make it uniquely Moira in Witch mode.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return Response.json({ reading: text });
  } catch (err) {
    console.error("Horror reading API error:", err);
    return Response.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}
