"use client";

import Link from "next/link";
import { getRealPaymentLink } from "@/lib/payment-link";

const SOCIAL_LINKS = [
  { label: "TikTok", url: process.env.NEXT_PUBLIC_TIKTOK_URL },
  { label: "Instagram", url: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: "YouTube", url: process.env.NEXT_PUBLIC_YOUTUBE_URL },
].filter((link): link is { label: string; url: string } => Boolean(link.url));

export default function Home() {
  const paymentLink = getRealPaymentLink();

  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] overflow-hidden relative">
      {/* Star background animation */}
      <div className="star-bg">
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-between px-8 md:px-16 py-20">
          <div className="flex-1 max-w-2xl">
            <h1 className="font-serif text-6xl md:text-7xl font-bold mb-6" style={{ color: "#E3B84B" }}>
              Your stars are screaming.
            </h1>
            <p className="text-xl md:text-2xl text-[#D4C5F9] mb-8 leading-relaxed">
              Horror-comedy horoscopes personalized to your birth date. Fictional entertainment for your amusement only.
            </p>
            <Link
              href="/onboarding"
              className="inline-block px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
              style={{
                backgroundColor: "#E3B84B",
                color: "#0B0B14",
              }}
            >
              Dare to see your HorrorScope?
            </Link>
          </div>

          {/* Sonia Avatar */}
          <div className="hidden lg:flex flex-1 justify-center items-center relative">
            <img
              src="/assets/sonia.png"
              alt="Sonia - Your HorrorScope Guide"
              className="w-96 h-96 object-contain drop-shadow-lg"
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-8 md:px-16 bg-[#111120]">
          <h2 className="font-serif text-5xl font-bold text-center mb-16" style={{ color: "#E3B84B" }}>
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1 */}
            <div className="bg-[#1A1A2E] rounded-lg p-8 border border-[#E3B84B]/20 hover:border-[#E3B84B]/50 transition-all">
              <div
                className="text-4xl font-serif font-bold mb-4"
                style={{ color: "#E3B84B" }}
              >
                01
              </div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-[#F2EEF7]">
                Enter Your Birthday
              </h3>
              <p className="text-[#D4C5F9] leading-relaxed">
                Share your birth date and we&apos;ll calculate your zodiac sign and generate your personalized horror-comedy reading.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1A1A2E] rounded-lg p-8 border border-[#E3B84B]/20 hover:border-[#E3B84B]/50 transition-all">
              <div
                className="text-4xl font-serif font-bold mb-4"
                style={{ color: "#E3B84B" }}
              >
                02
              </div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-[#F2EEF7]">
                Get Your Reading
              </h3>
              <p className="text-[#D4C5F9] leading-relaxed">
                Receive your darkly comedic horoscope, complete with unsettling predictions and hilariously ominous advice for your future.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1A1A2E] rounded-lg p-8 border border-[#E3B84B]/20 hover:border-[#E3B84B]/50 transition-all">
              <div
                className="text-4xl font-serif font-bold mb-4"
                style={{ color: "#E3B84B" }}
              >
                03
              </div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-[#F2EEF7]">
                Change Your Fate
              </h3>
              <p className="text-[#D4C5F9] leading-relaxed">
                Use the cosmic insights (with a grain of salt) to navigate your destiny with humor, horror, and a healthy skepticism.
              </p>
            </div>
          </div>
        </section>

        {/* Veil Season Pass */}
        <section className="py-20 px-8 md:px-16">
          <div className="max-w-3xl mx-auto text-center bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-10 md:p-14">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4" style={{ color: "#E3B84B" }}>
              The Veil Season Pass
            </h2>
            <p className="text-[#D4C5F9] text-lg leading-relaxed mb-8">
              One payment. Unlimited AI-written readings from Sonia and unlimited fate rewrites from Moira, through November 15.
              No subscription, nothing to cancel.
            </p>
            {paymentLink ? (
              <a
                href={paymentLink}
                className="inline-block px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#E3B84B", color: "#0B0B14" }}
              >
                Get the Pass — $9.99
              </a>
            ) : (
              <span
                className="inline-block px-8 py-4 text-lg font-semibold rounded-lg opacity-50 cursor-not-allowed"
                style={{ backgroundColor: "#E3B84B", color: "#0B0B14" }}
                title="Coming soon"
              >
                Coming Soon
              </span>
            )}
            {paymentLink && (
              <p className="text-[#D4C5F9]/60 text-sm mt-4">
                Already have a pass?{" "}
                <a href="/pass" className="underline hover:text-[#E3B84B] transition">
                  Resend my unlock link
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-8 md:px-16 border-t border-[#E3B84B]/20">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-[#D4C5F9] text-sm">
              HorrorScope is fictional entertainment for entertainment purposes only. Not real astrology or advice. For maximum entertainment, please suspend disbelief.
            </p>
            {SOCIAL_LINKS.length > 0 && (
              <div className="flex justify-center gap-8 mt-6 text-sm">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4C5F9] hover:text-[#E3B84B] transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <a href="/privacy" className="text-[#E3B84B] hover:text-[#F2EEF7] transition">Privacy</a>
              <a href="/terms" className="text-[#E3B84B] hover:text-[#F2EEF7] transition">Terms</a>
              <a href="mailto:hello@horrorscope.art" className="text-[#E3B84B] hover:text-[#F2EEF7] transition">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
