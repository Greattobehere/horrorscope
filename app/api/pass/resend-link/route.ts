import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { signPass, unlockUrl, PASS_EXPIRY } from "@/lib/pass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Constructed lazily inside the handler — instantiating at module load would
// throw during `next build`'s page-data collection when the keys aren't set.

/**
 * "I lost my link." Looks up a succeeded payment tagged with this email and
 * re-mints the pass. Only ever emails addresses that actually paid, so there's
 * no way to use this to spam a stranger.
 *
 * Always returns the same message either way — don't leak who bought.
 */
export async function POST(req: NextRequest) {
  const generic = NextResponse.json({
    ok: true,
    message: "If that address bought a pass, the link is on its way.",
  });

  let email: string;
  try {
    const body = await req.json();
    email = String(body.email || "").toLowerCase().trim();
  } catch {
    return generic;
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return generic;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.RESEND_API_KEY) {
    console.error("resend-link: STRIPE_SECRET_KEY or RESEND_API_KEY not set");
    return generic;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Stripe search only indexes metadata we set in the webhook.
  const escaped = email.replace(/'/g, "");
  try {
    const found = await stripe.paymentIntents.search({
      query: `metadata['hs_email']:'${escaped}' AND status:'succeeded'`,
      limit: 1,
    });
    if (found.data.length === 0) return generic;

    await resend.emails.send({
      from: "Moira <moira@horrorscope.art>",
      to: email,
      subject: "Your Veil Season Pass link, again",
      html: `<div style="font-family:Georgia,serif;max-width:520px;line-height:1.6">
        <p>Moira says losing things is on brand for you.</p>
        <p style="margin:24px 0">
          <a href="${unlockUrl(signPass(email, PASS_EXPIRY))}"
             style="background:#1a1a1a;color:#fff;padding:14px 26px;
                    text-decoration:none;border-radius:4px;display:inline-block;
                    font-family:system-ui,sans-serif">Unlock my readings</a>
        </p>
        <p style="font-size:13px;color:#777">Valid through November 15.</p>
      </div>`,
    });
  } catch (err) {
    console.error("resend-link failed:", err);
  }

  return generic;
}
