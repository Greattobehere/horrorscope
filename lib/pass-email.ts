import { INSTALL_TEXT, installHtml } from "@/lib/install-steps";

// The Veil Season Pass emails (after purchase, and "lost my link"). Shared so both look
// like the same real message to Gmail: a heading, a few sentences of explanation, one
// button, the plain link written out, who it's from and why you got it, plus a plain-text
// version. A bare one-line email with a button looks like phishing from a new domain,
// and Gmail silently dropped those.

type Kind = "purchase" | "again";

const COPY: Record<Kind, { subject: string; heading: string; intro: string }> = {
  purchase: {
    subject: "Your Veil Season Pass (Moira is unimpressed that you paid)",
    heading: "Your Veil Season Pass is ready.",
    intro:
      "Moira says thank you for your money. She also says you could have saved it and simply kept making the same " +
      "choices, but nobody asked her.",
  },
  again: {
    subject: "Your Veil Season Pass unlock link",
    heading: "Here is your unlock link again.",
    intro:
      "You asked for your Veil Season Pass link on horrorscope.art, so here it is. Moira says losing things is very " +
      "on brand for you.",
  },
};

export function passEmail(kind: Kind, url: string) {
  const c = COPY[kind];
  const why =
    kind === "purchase"
      ? "You're getting this email because you bought a Veil Season Pass at horrorscope.art."
      : "You're getting this email because someone asked for the Veil Season Pass link for this address at horrorscope.art/pass. If that wasn't you, you can ignore it.";
  const html = `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6">
    <h1 style="font-size:22px;margin:0 0 18px">${c.heading}</h1>
    <p>${c.intro}</p>
    <p>Your pass unlocks unlimited fate rewrites with Moira and Sonia through December 31.</p>
    <p style="margin:28px 0">
      <a href="${url}"
         style="background:#1a1a1a;color:#fff;padding:14px 26px;text-decoration:none;
                border-radius:4px;display:inline-block;font-family:system-ui,sans-serif">
        Unlock my readings
      </a>
    </p>
    <p style="font-size:14px;color:#555">
      This link is yours. Clicking it on a device signs that device in until December 31, when the longest nights have
      passed and the pass ends. Keep this email if you use more than one device.
    </p>
    <p style="font-size:13px;color:#777;word-break:break-all">If the button doesn't work, copy this link: ${url}</p>
    ${installHtml()}
    <p style="font-size:14px;color:#555">On your phone, tap <b>Unlock my readings</b> above once, on that phone, to bring your pass with you.</p>
    <p style="font-size:13px;color:#777;margin-top:32px">
      Lost it later? Go to horrorscope.art/pass and enter this email address.<br>
      ${why}<br>
      HorrorScope · horrorscope.art · Questions? Just reply to this email.
    </p>
  </div>`;
  const text = [
    c.heading,
    "",
    c.intro,
    "",
    "Your pass unlocks unlimited fate rewrites with Moira and Sonia through December 31.",
    "",
    `Unlock my readings: ${url}`,
    "",
    "Clicking the link on a device signs that device in until December 31. Keep this email if you use more than one device.",
    "Lost it later? Go to horrorscope.art/pass and enter this email address.",
    "",
    INSTALL_TEXT,
    "On your phone, open the unlock link above once, on that phone, to bring your pass with you.",
    "",
    why,
    "HorrorScope - horrorscope.art - Questions? Just reply to this email.",
  ].join("\n");
  return { subject: c.subject, html, text, replyTo: "hello@horrorscope.art" };
}
