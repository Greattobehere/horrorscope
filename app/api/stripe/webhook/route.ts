import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { signPass, unlockUrl, PASS_EXPIRY } from "@/lib/pass";

// Must be nodejs — we need the raw body for signature verification.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Constructed lazily inside the handler — instantiating at module load would
// throw during `next build`'s page-data collection when the keys aren't set.

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.RESEND_API_KEY) {
    console.error("Stripe webhook: missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, or RESEND_API_KEY");
    return new NextResponse("Server not configured", { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  // Raw text, not req.json() — Stripe signs the exact bytes.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "not paid" });
  }

  const email =
    session.customer_details?.email?.toLowerCase().trim() ||
    session.customer_email?.toLowerCase().trim();

  if (!email) {
    console.error("Paid session with no email:", session.id);
    return NextResponse.json({ received: true, skipped: "no email" });
  }

  // Tag the payment with the email so /api/pass/resend-link can find it later.
  // This is what replaces a database.
  if (typeof session.payment_intent === "string") {
    try {
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: { hs_email: email, hs_product: "veil_season_pass_2026" },
      });
    } catch (err) {
      console.error("Could not tag payment intent:", err);
      // Not fatal — the buyer still gets their link below.
    }
  }

  const token = signPass(email, PASS_EXPIRY);

  try {
    await resend.emails.send({
      from: "Moira <moira@horrorscope.art>",
      to: email,
      subject: "Your Veil Season Pass (Moira is unimpressed that you paid)",
      html: passEmailHtml(unlockUrl(token)),
    });
  } catch (err) {
    console.error("Resend failed for", email, err);
    // Return 200 anyway — a 500 makes Stripe retry the whole webhook, and the
    // buyer can always use the resend-link route. Check logs daily in October.
  }

  return NextResponse.json({ received: true });
}

function passEmailHtml(url: string): string {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6">
    <h1 style="font-size:22px;margin:0 0 18px">Your Veil Season Pass is ready.</h1>

    <p>Moira says thank you for your money. She also says you could have
    saved it and simply kept making the same choices, but nobody asked her.</p>

    <p style="margin:28px 0">
      <a href="${url}"
         style="background:#1a1a1a;color:#fff;padding:14px 26px;text-decoration:none;
                border-radius:4px;display:inline-block;font-family:system-ui,sans-serif">
        Unlock my readings
      </a>
    </p>

    <p style="font-size:14px;color:#555">
      This link is yours. Clicking it on a device signs that device in until
      November 15, when the veil closes and the pass ends. Keep the email if you
      use more than one device.
    </p>

    <p style="font-size:13px;color:#777;margin-top:32px">
      Lost it? Go to horrorscope.art/pass and enter this email address.
    </p>
  </div>`;
}
