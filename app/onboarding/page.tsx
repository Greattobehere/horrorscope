"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const getZodiacSign = (month: number, day: number): string => {
  // Zodiac signs with their date ranges
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  return "Unknown";
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState("");
  const [zodiacSign, setZodiacSign] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [tier, setTier] = useState("");
  const [formData, setFormData] = useState({
    birthDate: "",
    zodiacSign: "",
    email: "",
    marketingConsent: false,
    tier: "",
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setBirthDate(date);

    if (date) {
      const [year, month, day] = date.split("-");
      const zodiac = getZodiacSign(parseInt(month), parseInt(day));
      setZodiacSign(zodiac);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !birthDate) {
      alert("Please enter your birth date");
      return;
    }
    if (step === 2 && !email) {
      alert("Please enter your email");
      return;
    }
    if (step === 3 && !tier) {
      alert("Please select a tier");
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    setFormData({
      birthDate,
      zodiacSign,
      email,
      marketingConsent,
      tier,
    });
    console.log("Onboarding complete:", {
      birthDate,
      zodiacSign,
      email,
      marketingConsent,
      tier,
    });

    // persist sign locally as a fallback and pass via query param
    const normalizedSign = zodiacSign.toLowerCase();
    if (normalizedSign) {
      localStorage.setItem("horrorscope-sign", normalizedSign);
    }

    router.push(`/reading?sign=${encodeURIComponent(normalizedSign)}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/">
            <h1 className="font-serif text-3xl font-bold" style={{ color: "#E3B84B" }}>
              HorrorScope
            </h1>
          </Link>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full transition-all ${
                  num <= step ? "bg-[#E3B84B]" : "bg-[#E3B84B]/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#1A1A2E] rounded-lg border border-[#E3B84B]/20 p-8 md:p-12">
          {/* Step 1: Birth Date */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-4xl font-bold mb-2" style={{ color: "#E3B84B" }}>
                  Enter Your Birthday
                </h2>
                <p className="text-[#D4C5F9] text-lg">
                  Let the cosmic forces know when you entered this realm.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[#F2EEF7] font-semibold mb-3">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={handleDateChange}
                    className="w-full bg-[#0B0B14] border border-[#E3B84B]/50 text-[#F2EEF7] px-4 py-3 rounded-lg focus:outline-none focus:border-[#E3B84B] transition"
                  />
                </div>

                {zodiacSign && (
                  <div className="bg-[#0B0B14] rounded-lg p-6 border border-[#E3B84B]/30">
                    <p className="text-[#D4C5F9] mb-2">Your Zodiac Sign:</p>
                    <p className="font-serif text-3xl font-bold" style={{ color: "#E3B84B" }}>
                      {zodiacSign}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Email & Consent */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-4xl font-bold mb-2" style={{ color: "#E3B84B" }}>
                  So We Can Haunt You
                </h2>
                <p className="text-[#D4C5F9] text-lg">
                  Share your email so we can send you your horror-comedy horoscope updates.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[#F2EEF7] font-semibold mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full bg-[#0B0B14] border border-[#E3B84B]/50 text-[#F2EEF7] px-4 py-3 rounded-lg focus:outline-none focus:border-[#E3B84B] transition placeholder:text-[#D4C5F9]/50"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 bg-[#0B0B14] border border-[#E3B84B]/50 rounded cursor-pointer accent-[#E3B84B]"
                  />
                  <label htmlFor="marketing" className="cursor-pointer">
                    <span className="text-[#F2EEF7] font-medium">
                      Send me personalized horror-scopes and exclusive content
                    </span>
                    <p className="text-[#D4C5F9] text-sm mt-1">
                      We promise to only send you the spookiest predictions and darkest comedy
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Choose Tier */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-4xl font-bold mb-2" style={{ color: "#E3B84B" }}>
                  Choose Your Fate
                </h2>
                <p className="text-[#D4C5F9] text-lg">
                  Select how deep into the cosmic horror you want to go.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Free Tier */}
                <div
                  onClick={() => setTier("free")}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    tier === "free"
                      ? "border-[#E3B84B] bg-[#0B0B14]"
                      : "border-[#E3B84B]/30 bg-[#0B0B14]/50 hover:border-[#E3B84B]/50"
                  }`}
                >
                  <h3 className="font-serif text-2xl font-bold mb-3" style={{ color: "#E3B84B" }}>
                    Free Tier
                  </h3>
                  <p className="text-[#D4C5F9] text-sm mb-4">
                    Basic horror-scope readings with mild cosmic dread
                  </p>
                  <ul className="space-y-2 text-[#D4C5F9] text-sm">
                    <li>✓ One reading per month</li>
                    <li>✓ Basic predictions</li>
                    <li>✓ Email updates</li>
                  </ul>
                  <p className="font-serif text-3xl font-bold mt-6">
                    <span style={{ color: "#E3B84B" }}>Free</span>
                  </p>
                </div>

                {/* Paid Tier */}
                <div
                  onClick={() => setTier("paid")}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    tier === "paid"
                      ? "border-[#E3B84B] bg-[#0B0B14]"
                      : "border-[#E3B84B]/30 bg-[#0B0B14]/50 hover:border-[#E3B84B]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-2xl font-bold" style={{ color: "#E3B84B" }}>
                      Paid Tier
                    </h3>
                    <span className="bg-[#E3B84B] text-[#0B0B14] text-xs font-bold px-3 py-1 rounded">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[#D4C5F9] text-sm mb-4">
                    Unlimited deep cosmic horror and personalized terror
                  </p>
                  <ul className="space-y-2 text-[#D4C5F9] text-sm">
                    <li>✓ Unlimited readings</li>
                    <li>✓ Advanced predictions</li>
                    <li>✓ Daily updates</li>
                    <li>✓ Exclusive content</li>
                  </ul>
                  <p className="font-serif text-3xl font-bold mt-6">
                    <span style={{ color: "#E3B84B" }}>$4.99</span>
                    <span className="text-sm text-[#D4C5F9] font-normal">/month</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#E3B84B]/20">
            <button
              onClick={handlePrevStep}
              disabled={step === 1}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                step === 1
                  ? "bg-[#E3B84B]/20 text-[#D4C5F9]/50 cursor-not-allowed"
                  : "bg-[#E3B84B]/20 text-[#E3B84B] hover:bg-[#E3B84B]/30"
              }`}
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-8 py-3 rounded-lg font-semibold transition"
                style={{
                  backgroundColor: "#E3B84B",
                  color: "#0B0B14",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-8 py-3 rounded-lg font-semibold transition"
                style={{
                  backgroundColor: "#E3B84B",
                  color: "#0B0B14",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Complete ✓
              </button>
            )}
          </div>

          {/* Step Indicator */}
          <div className="text-center mt-8 text-[#D4C5F9] text-sm">
            Step {step} of 3
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-[#D4C5F9] hover:text-[#E3B84B] transition text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
