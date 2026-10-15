import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { signPass, unlockUrl, PASS_EXPIRY } from "@/lib/pass";
import { passEmail } from "@/lib/pass-email";

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
    // Resend reports failures (e.g. an unverified sending domain) in its return
    // value instead of throwing, so check it or a failure is silent.
    const { error: sendError } = await resend.emails.send({
      from: "Moira <moira@horrorscope.art>",
      to: email,
      ...passEmail("purchase", unlockUrl(token)),
    });
    if (sendError) console.error("[Email] pass email not sent:", sendError.message);
  } catch (err) {
    console.error("Resend failed for", email, err);
    // Return 200 anyway — a 500 makes Stripe retry the whole webhook, and the
    // buyer can always use the resend-link route. Check logs daily in October.
  }

  return NextResponse.json({ received: true });
}

