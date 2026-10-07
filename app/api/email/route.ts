import { Resend } from "resend";

// Saves the visitor to Resend's Contacts list (Resend dashboard -> Audience -> Contacts,
// exportable as CSV) and sends the welcome email. Visitors who didn't tick the
// marketing box are saved as unsubscribed, so a broadcast can never reach them.
export async function POST(request: Request) {
  try {
    const { email, marketingConsent } = await request.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return Response.json({ error: "Missing email" }, { status: 400 });
    }
    const address = email.trim().toLowerCase();

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log("[Email capture] RESEND_API_KEY not set — logging only:", address);
      return Response.json({ success: true });
    }

    const resend = new Resend(apiKey);

    // The SDK returns errors instead of throwing; a repeat visitor already being a
    // contact is fine, so this never blocks the welcome email.
    const { error: contactError } = await resend.contacts.create({
      email: address,
      unsubscribed: marketingConsent !== true,
    });
    if (contactError) console.error("[Email capture] contact not saved:", address, contactError.message);

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
