import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Missing email" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log("[Email capture] RESEND_API_KEY not set — logging only:", email);
      return Response.json({ success: true });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "HorrorScope <noreply@horrorscope.app>",
      to: email,
      subject: "Your fate has been recorded, dear seeker.",
      html: `
        <div style="background:#0B0B14;color:#F2EEF7;padding:40px;font-family:serif;max-width:600px;margin:0 auto;border:2px solid #E3B84B;border-radius:12px;">
          <h1 style="color:#E3B84B;font-size:32px;margin-bottom:8px;">HorrorScope</h1>
          <p style="color:#D4C5F9;font-size:18px;margin-bottom:24px;">Sireal has noted your arrival.</p>
          <p style="font-size:16px;line-height:1.7;margin-bottom:16px;">
            Welcome, dear seeker. Your cosmic file has been opened, your stars catalogued, and your fate — well, that part is still being argued over by several arguing constellations.
          </p>
          <p style="font-size:16px;line-height:1.7;margin-bottom:24px;">
            Return to HorrorScope any time the universe has something unsettling to tell you. Which, if history is any guide, will be soon.
          </p>
          <p style="color:#E3B84B;font-size:14px;">— Sireal, Fortune Teller of Dubious Reputation</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email API error:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
