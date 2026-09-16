import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] px-6 md:px-16 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl font-bold mb-2" style={{ color: "#E3B84B" }}>
          Terms of Service
        </h1>
        <p className="text-[#D4C5F9]/70 text-sm mb-10">Last updated September 15, 2026</p>

        <div className="space-y-8 text-[#D4C5F9] leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Entertainment only
            </h2>
            <p>
              HorrorScope is fictional comedy-horror entertainment personalized to the birth data you provide. It is
              not real astrology, and not medical, legal, or financial advice. Nothing on this site should inform a
              real decision. If a reading tells you a demon is reorganizing your kitchen, that is a joke.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              The Veil Season Pass
            </h2>
            <p>
              The Veil Season Pass is a one-time purchase of $9.99 granting unlimited AI-generated readings and fate
              rewrites through November 15, 2026. It is not a subscription — it does not renew and there is nothing
              to cancel. Access ends automatically when the pass expires. Because it&apos;s a limited-run digital
              product consumed immediately upon purchase, purchases are final; if something went wrong with your
              order, email{" "}
              <a href="mailto:hello@horrorscope.art" className="underline hover:text-[#E3B84B]">
                hello@horrorscope.art
              </a>{" "}
              and we&apos;ll sort it out.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Acceptable use
            </h2>
            <p>
              Don&apos;t use HorrorScope to harass, threaten, or generate content targeting a real, identifiable
              person. Readings are about fictional zodiac archetypes, not real individuals. We may block access for
              abuse of the service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              No warranty
            </h2>
            <p>
              HorrorScope is provided &quot;as is,&quot; for amusement, with no guarantee that Sonia&apos;s or
              Moira&apos;s prophecies will come true — or, for that matter, that they won&apos;t.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
              Contact
            </h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:hello@horrorscope.art" className="underline hover:text-[#E3B84B]">
                hello@horrorscope.art
              </a>
              .
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
