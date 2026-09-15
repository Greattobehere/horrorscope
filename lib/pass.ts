import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * The Veil Season Pass — stateless access tokens.
 *
 * No database. A pass is a signed string containing the buyer's email and an
 * expiry date. We sign it with PASS_SECRET, email it to them, and store it in
 * an httpOnly cookie. To check access we verify the signature. That's it.
 *
 * Nobody can forge one without PASS_SECRET, and nothing needs to be stored
 * server-side, which is exactly what you want with five weeks on the clock.
 */

const SECRET = process.env.PASS_SECRET;

/** The pass ends here. Everyone gets the same date, regardless of purchase day. */
export const PASS_EXPIRY = "2026-11-15T23:59:59.000Z";

export const PASS_COOKIE = "hs_pass";

export type Pass = { email: string; exp: string };

function hmac(payload: string): string {
  if (!SECRET) throw new Error("PASS_SECRET is not set");
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function signPass(email: string, expiresAt: string = PASS_EXPIRY): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase().trim(), exp: expiresAt })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyPass(token?: string | null): Pass | null {
  if (!token || !token.includes(".")) return null;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  let expected: string;
  try {
    expected = hmac(payload);
  } catch {
    return null;
  }

  // Constant-time compare. Length check first — timingSafeEqual throws on mismatch.
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Pass;
    if (!data.email || !data.exp) return null;
    if (new Date(data.exp).getTime() < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Server-side helper. Use this in any route that should be pass-gated. */
export async function getPass(): Promise<Pass | null> {
  const store = await cookies();
  return verifyPass(store.get(PASS_COOKIE)?.value);
}

export function unlockUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://horrorscope.art";
  return `${base}/unlock?t=${encodeURIComponent(token)}`;
}
