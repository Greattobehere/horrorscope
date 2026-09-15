import { NextRequest, NextResponse } from "next/server";
import { verifyPass, PASS_COOKIE, PASS_EXPIRY } from "@/lib/pass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The link in the purchase email points here. We verify the token, drop it in
 * an httpOnly cookie, and send them to the app. That's the whole login system.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const pass = verifyPass(token);

  if (!pass || !token) {
    return NextResponse.redirect(new URL("/pass/invalid", req.url));
  }

  const res = NextResponse.redirect(new URL("/?unlocked=1", req.url));
  res.cookies.set(PASS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(PASS_EXPIRY),
  });
  return res;
}
