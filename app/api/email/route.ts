import { Resend } from "resend";

// Newsletter signups go to Kit (kit.com), where the owner writes and sends updates.
// Only visitors who ticked the marketing box are added. Needs KIT_API_KEY (Kit ->
// Settings -> Developer -> API keys, a v4 key); KIT_TAG_ID optionally tags them.
async function addToKit(email: string) {
  const key = process.env.KIT_API_KEY;
  if (!key) return;
  const headers = { "X-Kit-Api-Key": key, "Content-Type": "application/json" };
  const res = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email, state: "active" }),
  });
  if (!res.ok) {
    console.error("[Kit] subscriber not added:", res.status, await res.text());
    return;
  }
  const tag = process.env.KIT_TAG_ID;
  if (tag) {
    const tagged = await fetch(`https://api.kit.com/v4/tags/${encodeURIComponent(tag)}/subscribers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: email }),
    });
    if (!tagged.ok) console.error("[Kit] tag not added:", tagged.status, await tagged.text());
  }
}

// Adds newsletter signups to Kit (the mailing list) and sends the welcome email
// through Resend. Visitors who didn't tick the marketing box are never added to Kit.
export async function POST(request: Request) {
  try {
    const { email, marketingConsent } = await request.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return Response.json({ error: "Missing email" }, { status: 400 });
    }
    const address = email.trim().toLowerCase();

    if (marketingConsent === true) {
      await addToKit(address).catch((err) =>
        console.error("[Kit] error:", err),
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log("[Email capture] RESEND_API_KEY not set — logging only:", address);
      return Response.json({ success: true });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "HorrorScope <noreply@horrorscope.art>",
      to: address,
      subject: "Your fate has been recorded, dear seeker.",
      html: `
        <div style="background:#0B0B14;color:#F2EEF7;padding:40px;font-family:serif;max-width:600px;margin:0 auto;border:2px solid #E3B84B;border-radius:12px;">
          <h1 style="color:#E3B84B;font-size:32px;margin-bottom:8px;">HorrorScope</h1>
          <p style="color:#D4C5F9;font-size:18px;margin-bottom:24px;">Sonia has noted your arrival.</p>
          <p style="font-size:16px;line-height:1.7;margin-bottom:16px;">
            Welcome, dear seeker. Your cosmic file has been opened, your stars catalogued, and your fate — well, that part is still being argued over by several arguing constellations.
          </p>
          <p style="font-size:16px;line-height:1.7;margin-bottom:24px;">
            Return to HorrorScope any time the universe has something unsettling to tell you. Which, if history is any guide, will be soon.
          </p>
          <p style="color:#E3B84B;font-size:14px;">— Sonia, Fortune Teller of Dubious Reputation</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email API error:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
