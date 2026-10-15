import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { signPass, unlockUrl, PASS_EXPIRY } from "@/lib/pass";
import { passEmail } from "@/lib/pass-email";

/** A refunded purchase doesn't get its link re-sent. Needs "Charges: Read" on the key; without it, assume not refunded. */
async function refunded(stripe: Stripe, pi: string | Stripe.PaymentIntent | null): Promise<boolean> {
  if (!pi) return false;
  try {
    const intent = await stripe.paymentIntents.retrieve(typeof pi === "string" ? pi : pi.id, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    return typeof charge === "object" && charge !== null && charge.refunded;
  } catch {
    return false;
  }
}

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

  try {
    // Look the buyer up by the email on their paid Checkout Session. (The webhook's
    // metadata tag isn't reliable: with newer API versions the session can arrive
    // without a payment_intent, so the tag was never written.)
    // Stripe's email filter is case-sensitive and buyers type "Name@Gmail.com", so compare
    // lowercase across recent paid sessions (passes are seasonal, so this list stays small).
    let paid = false;
    const since = Math.floor(Date.now() / 1000) - 200 * 24 * 3600;
    for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, status: "complete", limit: 100 })) {
      const buyer = (s.customer_details?.email || s.customer_email || "").toLowerCase().trim();
      if (buyer === email && s.payment_status === "paid" && !(await refunded(stripe, s.payment_intent))) {
        paid = true;
        break;
      }
    }
    if (!paid) {
      // Older purchases that were tagged by the webhook.
      const escaped = email.replace(/'/g, "");
      const found = await stripe.paymentIntents.search({
        query: `metadata['hs_email']:'${escaped}' AND status:'succeeded'`,
        limit: 1,
      });
      paid = found.data.length > 0;
    }
    if (!paid) {
      console.log("resend-link: no paid checkout found for that address");
      return generic;
    }

    // Resend reports failures (e.g. an unverified sending domain) in its return
    // value instead of throwing, so check it or a failure is silent.
    const { error: sendError } = await resend.emails.send({
      from: "Moira <moira@horrorscope.art>",
      to: email,
      ...passEmail("again", unlockUrl(signPass(email, PASS_EXPIRY))),
    });
    if (sendError) console.error("[Email] resend-link email not sent:", sendError.message);
    else console.log("resend-link: unlock link sent");
  } catch (err) {
    console.error("resend-link failed:", err);
  }

  return generic;
}
