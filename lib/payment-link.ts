/**
 * NEXT_PUBLIC_PAYMENT_LINK starts life as a placeholder until the Stripe
 * product is actually created. Never link to it until it looks like a real
 * Stripe Payment Link — a dead link on a live purchase button is worse than
 * a "coming soon" state.
 */
export function getRealPaymentLink(): string | null {
  const link = process.env.NEXT_PUBLIC_PAYMENT_LINK;
  if (!link) return null;
  if (!link.startsWith("https://buy.stripe.com/")) return null;
  if (link.includes("placeholder")) return null;
  return link;
}
