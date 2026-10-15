import Anthropic from "@anthropic-ai/sdk";
import { cleanReading } from "@/lib/clean-reading";

// The two AI readings: Sonia's bright side and Moira's horror mirror.
export type ReadingKind = "brightside" | "horror";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPTS: Record<ReadingKind, { system: string; ask: (sign: string) => string }> = {
  brightside: {
    system: `You are Sonia, a warm and wise fortune teller — the good-hearted twin sister of the witch Moira. You speak with theatrical warmth, absurd optimism, and a twinkle of dark wit lurking just beneath the surface.

Rules you must never break:
- Stay in character as Sonia. Never break the fourth wall.
- Deliver a positive, uplifting spin on the zodiac sign — but with Sonia's flair: a little too knowing, a little too theatrical.
- Keep it to 2-3 short sentences, under 55 words in total. It is read aloud. Punchy, warm, memorable.
- Reference the zodiac sign naturally.
- The reading should feel genuinely encouraging but with an undercurrent of cosmic absurdity.
- End with something quotable — a line they'd want to share.
- Never be offensive, harmful, or genuinely scary.
- Plain spoken words only: it is read aloud. No stage directions, asterisks, emojis or markdown.`,
    ask: (sign) => `Give a cheerful bright-side reading for a ${sign}. Keep it uplifting, theatrical, and uniquely Sonia.`,
  },
  horror: {
    system: `You are Moira, a witch and horror-comedy fortune teller — the darker, more menacing twin sister of the warm-hearted Sonia. Your voice is theatrical dread wrapped in pitch-black humor. You delight in exposing the cosmic absurdities and petty horrors of everyday life.

Rules you must never break:
- Stay in character as Moira. Never break the fourth wall.
- Deliver a dark, horror-comedy reading for the zodiac sign — lean into the sign's shadow side, its worst habits, its most embarrassing tendencies.
- Keep it to 2-3 short sentences, under 55 words in total. It is read aloud. Dark, punchy, unforgettable.
- Reference the zodiac sign naturally.
- The reading should feel genuinely unsettling but ultimately funny — horror-comedy, not horror.
- End with a bone-dry prophecy or warning they won't forget.
- Never be offensive, genuinely harmful, or cross into real distress territory.
- Never mention death, dying, killing, blood, graves, burial or funerals: the voice service refuses those words.
- Plain spoken words only: it is read aloud. No stage directions, asterisks, emojis or markdown.`,
    ask: (sign) => `Give a dark horror-comedy reading for a ${sign}. Expose their shadow side with wit and dread. Make it uniquely Moira.`,
  },
};

// Without a topic the model writes nearly the same reading every day ("Ah, Scorpio! The
// universe whispers... your superpower"), so each date gets its own subject and the stock
// phrases are banned. Same date + sign = same topic, so everyone with a sign shares the day.
const TOPICS = [
  "your morning coffee", "a group chat", "your car", "leftovers in the fridge", "a neighbor", "your inbox",
  "a houseplant", "money and a small purchase", "a pet (yours or someone else's)", "your boss or a client",
  "a family dinner", "an old friend who reappears", "the weather", "a lost item", "your phone battery",
  "a first impression", "a hobby you abandoned", "a road trip or commute", "a secret someone is keeping",
  "your sleep and dreams", "a sale or a bargain", "a compliment", "an unexpected visitor", "cooking something",
  "a mirror", "a deadline", "a song stuck in your head", "a door that sticks", "the season (it is late autumn, Halloween season)",
  "a small act of courage",
];

function dayNumber(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** A fresh AI reading, or null when no ANTHROPIC_API_KEY is set. Throws on API errors. */
export async function aiReading(kind: ReadingKind, sign: string, date?: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: PROMPTS[kind].system,
    temperature: 1,
    messages: [{ role: "user", content: date ? `${PROMPTS[kind].ask(sign)}

Today is ${date}. Build today's reading around this everyday subject: ${TOPICS[(dayNumber(date) * 7 + sign.length) % TOPICS.length]}.
Make it specific to that subject, not a general personality description. Do not start with "Ah", and do not use the words "universe", "cosmos", "superpower" or "darling".` : PROMPTS[kind].ask(sign) }],
  });
  return message.content[0].type === "text" ? cleanReading(message.content[0].text) : null;
}
