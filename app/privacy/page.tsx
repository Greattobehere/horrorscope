import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] px-6 md:px-16 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl font-bold mb-2" style={{ color: "#E3B84B" }}>
          Privacy Policy
        </h1>
        <p className="text-[#D4C5F9]/70 text-sm mb-10">Last updated September 15, 2026</p>

        <div className="space-y-8 text-[#D4C5F9] leading-relaxed">
          <p>
            HorrorScope (&quot;we,&quot; &quot;us&quot;) is a horror-comedy entertainment site at horrorscope.art.
            This page explains what we collect, why, and how to get it removed. It is written in plain language
            rather than legal boilerplate — if you have questions, email{" "}
            <a href="mailto:hello@horrorscope.art" className="underline hover:text-[#E3B84B]">
              hello@horrorscope.art
            </a>
            .
          </p>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              What we collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Birth date</strong> you enter to get a reading. It&apos;s sent to Anthropic&apos;s API to
                generate your personalized text and is not stored in any database of ours.
              </li>
              <li>
                <strong>Email address</strong>, if you choose to give one — either through the optional mailing-list
                signup or when you buy a Veil Season Pass through Stripe. We use it to send you the email you signed
                up for and nothing else.
              </li>
              <li>
                <strong>Payment details</strong> if you buy a pass. These go directly to Stripe — we never see or
                store your card number.
              </li>
              <li>
                <strong>One cookie</strong> that proves you hold a valid Veil Season Pass. It contains your email and
                an expiry date, cryptographically signed so it can&apos;t be forged, and it stops working after the
                pass expires (November 15, 2026) or if you clear your cookies.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Who we share it with
            </h2>
            <p>
              Anthropic (to generate reading text), Stripe (to process payments), and Resend (to deliver
              transactional emails like your unlock link or newsletter). We don&apos;t sell data, and we don&apos;t
              share it with anyone else.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Deleting your data
            </h2>
            <p>
              There&apos;s no account system, so there&apos;s very little to delete. Clearing your cookies removes
              your pass token from your device. To unsubscribe from emails, use the link in any email we send, or
              contact us directly and we&apos;ll remove your address from our mailing list.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Children
            </h2>
            <p>HorrorScope is not directed at children and is not intended for users under 13.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Changes
            </h2>
            <p>
              If this policy changes materially, we&apos;ll update the date at the top of this page.
            </p>
          </section>
        </div>

        <Link href="/" className="inline-block mt-12 text-[#D4C5F9] hover:text-[#E3B84B] transition font-semibold">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
