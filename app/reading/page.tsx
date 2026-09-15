"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import PortraitCrossfade from "../components/PortraitCrossfade";
import ShareCard from "../components/ShareCard";
import { Suspense } from "react"
import { READINGS, getReadingIndex } from "../data/readings";
import { getRealPaymentLink } from "@/lib/payment-link";

function ReadingPageInner() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [fateMessage, setFateMessage] = useState("");
  const [needsPass, setNeedsPass] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [sliders, setSliders] = useState({
    love: 5,
    wealth: 5,
    health: 5,
    fame: 5,
    wisdom: 5,
  });

  const searchParams = useSearchParams();
  const querySign = searchParams?.get("sign") ?? "";
  const [sign, setSign] = useState<string>(querySign || "");

  // AI readings state
  const [aiBrightSide, setAiBrightSide] = useState<string>("");
  const [aiHorrorMirror, setAiHorrorMirror] = useState<string>("");
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);

  useEffect(() => {
    const storedSign = typeof window !== "undefined" ? localStorage.getItem("horrorscope-sign") : "";
    const normalizedQuerySign = querySign?.toLowerCase() || "";

    if (normalizedQuerySign) {
      setSign(normalizedQuerySign);
      if (typeof window !== "undefined") {
        localStorage.setItem("horrorscope-sign", normalizedQuerySign);
      }
    } else if (storedSign) {
      setSign(storedSign.toLowerCase());
    }
  }, [querySign]);

  // Fetch AI readings after the loading screen completes
  useEffect(() => {
    if (isLoading) return; // wait for 3-second loading screen to finish
    if (!sign) return;
    if (aiBrightSide && aiHorrorMirror) return; // already have results

    setIsLoadingReadings(true);

    Promise.all([
      fetch("/api/reading/brightside", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign }),
      }),
      fetch("/api/reading/horror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign }),
      }),
    ])
      .then(async ([bsRes, horRes]) => {
        const [bsData, horData] = await Promise.all([bsRes.json(), horRes.json()]);
        if (bsData.reading) setAiBrightSide(bsData.reading);
        if (horData.reading) setAiHorrorMirror(horData.reading);
      })
      .catch(() => {
        // fallback to static readings
      })
      .finally(() => {
        setIsLoadingReadings(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, sign]);

  const signLabel = sign ? sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase() : "Scorpio";

  const crossfadeBurnRef = useRef({ i: 0, r: 0, e: 0 });
  const burnRAF = useRef<number | null>(null);

  const setCSSBurnVars = (i: number, r: number, e: number) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--burnI", i.toString());
      document.documentElement.style.setProperty("--burnR", r.toString());
      document.documentElement.style.setProperty("--burnE", e.toString());
    }
  };

  useEffect(() => {
    const tick = () => {
      const nextI = Math.max(0, crossfadeBurnRef.current.i - 0.02);
      const nextR = Math.max(0, crossfadeBurnRef.current.r - 0.015);
      const nextE = Math.max(0, crossfadeBurnRef.current.e - 0.01);
      crossfadeBurnRef.current = { i: nextI, r: nextR, e: nextE };
      setCSSBurnVars(nextI, nextR, nextE);
      burnRAF.current = requestAnimationFrame(tick);
    };

    burnRAF.current = requestAnimationFrame(tick);
    return () => {
      if (burnRAF.current) cancelAnimationFrame(burnRAF.current);
    };
  }, []);

  const computeOmenScore = (values: {
    love: number;
    wealth: number;
    health: number;
    fame: number;
    wisdom: number;
  }) => {
    const avg = (values.love + values.wealth + values.health + values.fame + values.wisdom) / 5;
    return Math.round((avg / 10) * 100);
  };

  const omenScore = computeOmenScore(sliders);

  const currentSign = sign.toLowerCase() || "scorpio";
  const readingIndex = getReadingIndex();

  const brightSideText = READINGS[currentSign]?.brightSide[readingIndex] ?? READINGS["scorpio"].brightSide[readingIndex];
  const horrorMirrorText = READINGS[currentSign]?.horrorMirror[readingIndex] ?? READINGS["scorpio"].horrorMirror[readingIndex];

  // Use AI reading if available, fall back to static
  const displayBrightSide = aiBrightSide || brightSideText;
  const displayHorrorMirror = aiHorrorMirror || horrorMirrorText;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }));
    crossfadeBurnRef.current = {
      i: 1,
      r: 1,
      e: 1,
    };
  };

  const [showFate, setShowFate] = useState(false);

  const getStaticFate = (score: number, label: string) => {
    const doomIndex = Math.min(4, Math.floor(score / 20));
    const bandName = doomIndex === 0 ? "Doomed" : doomIndex === 1 ? "Troubled" : doomIndex === 2 ? "Uncertain" : doomIndex === 3 ? "Promising" : "Blessed";
    const fateMessagesPerBand: Record<number, string[]> = {
      0: [
        `Doomed, ${label}. Your pulse is a haunted metronome, and the only thing growing faster than your anxiety is your willingness to laugh as the abyss takes notes.`,
        `The stars say: You turned 'threat level red' into an art project. Today, the universe will gift you one terrifyingly accurate reminder that ghost stories are just job security for your nightmares.`,
        `If fate were a meme, you'd be the GIF that auto-repeats in slow motion. The darkest jokes are about the ones who still think they can leave early.`,
      ],
      1: [
        `Troubled, ${label}. You're balancing on a rope that is definitely judgmental. Expect a surprise with the tone of 'remember when you swore you'd change?' and the consequences of ignoring that inner cat voice.`,
        `Witty warning: Your current choices are like adding glitter to a broken spell. It looks cute, but cleanup is still going to take forever.`,
        `The cosmos says: Your dreams are valuable, but your timing is a little 3 a.m. text message, so brace for deliciously awkward payback.`,
      ],
      2: [
        `Uncertain, ${label}. You are teetering between "strategic genius" and "please help". The universe can't decide either; it's sending random clues disguised as reuseable memes.`,
        `You are at 50/50 luck, like choosing the right line at 7-11. One more push and you get a free coffee. One less and you get stale chips.`,
        `Teasing fate: You're in the middle of a plot twist that will either make you unapologetically smug or delightfully humble. Pick your side with style.`,
      ],
      3: [
        `Promising, ${label}. Your choices are generating quiet miracles: someone hears the perfect joke at the perfect time, and the universe will give you a nod you can feel in your bones.`,
        `Warmly, your path is bright enough to cast soft gold shadows. Today's omen is a perfectly brewed cup of confidence.`,
        `Your stars are smiling. Expect the sort of small wins that taste like champagne and make your past self high-five you from the good habits aisle.`,
      ],
      4: [
        `Blessed, ${label}! The cosmos is serving you fireworks with a side of empowerment. Your future is basically an influencer caption that's too good to be true.`,
        `Ecstatic energy: you're on a roll so smooth the universe forgot to pause for plot twists. Enjoy your victory lap, you earned it with grace and a little insane courage.`,
        `Over-the-top: The gods are taking notes on your manifesting ability. Today's blessings are delivered by a choir of lucky puppies and complimentary velvet ropes.`,
      ],
    };
    const fateArray = fateMessagesPerBand[doomIndex];
    const randomFate = fateArray[Math.floor(Math.random() * fateArray.length)];
    return `${bandName} ${score} | ${randomFate}`;
  };

  const handleRewriteFate = async () => {
    setShowFate(false);
    setNeedsPass(false);
    setFateMessage("Moira is consulting the void...");
    setTimeout(() => setShowFate(true), 10);

    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign: currentSign, omenScore }),
      });

      if (response.status === 402) {
        setNeedsPass(true);
      } else if (!response.ok) {
        throw new Error("API error");
      } else {
        const data = await response.json();
        if (data.reading) {
          setShowFate(false);
          setFateMessage(data.reading);
          setTimeout(() => setShowFate(true), 10);
          return;
        }
      }
    } catch {
      // fall through to static fallback
    }

    setShowFate(false);
    setFateMessage(getStaticFate(omenScore, signLabel));
    setTimeout(() => setShowFate(true), 10);
  };

  const handleShare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy to clipboard");
    }
  };

  const handleShareFate = async () => {
    try {
      if (!fateMessage) {
        return;
      }
      setIsSharing(true);
      setShareStatus("Generating...");

      if (shareCardRef.current) {
        const dataUrl = await toPng(shareCardRef.current, { cacheBust: true });
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `horrorscope-fate-${Date.now()}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "HorrorScope Fate",
            text: fateMessage,
          });
          setShareStatus("Shared!");
        } else {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `horrorscope-fate-${Date.now()}.png`;
          link.click();
          setShareStatus("Downloaded!");
        }
      }

      await navigator.clipboard.writeText(fateMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setShareStatus("Failed. Copied text only.");
      try {
        await navigator.clipboard.writeText(fateMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareStatus(""), 2000);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] flex items-center justify-center px-4">
        <style>{`
          @keyframes pulse-gold {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(227, 184, 75, 0.7);
            }
            50% {
              box-shadow: 0 0 0 20px rgba(227, 184, 75, 0);
            }
          }
          .pulse-border {
            animation: pulse-gold 2s infinite;
          }
        `}</style>
        <div className="text-center">
          <div className="pulse-border border-4 border-[#E3B84B] rounded-lg p-8 w-96 h-96 flex items-center justify-center mb-8">
            <img src="/assets/sonia.png" alt="Sonia the fortune teller" style={{width: "280px", height: "auto"}} />
          </div>
          <h2 className="font-serif text-3xl font-bold" style={{ color: "#E3B84B" }}>
            Sonia is consulting the stars...
          </h2>
          <p className="text-[#D4C5F9] mt-4">Your reading awaits, dear {signLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] py-12 px-4 md:px-8">
      <style>{`
        @keyframes screen-flicker {
          0%, 100% { opacity: 1; }
          10% { opacity: 0.95; }
          20% { opacity: 1; }
          30% { opacity: 0.92; }
          40% { opacity: 1; }
        }
        .flicker {
          animation: screen-flicker 0.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .reading-shimmer {
          background: linear-gradient(90deg, #1A1A2E 25%, #2a2a4e 50%, #1A1A2E 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-bold mb-2" style={{ color: "#E3B84B" }}>
            Your HorrorScope Reading
          </h1>
          <p className="text-[#D4C5F9] text-lg">{signLabel} - Part {currentPart} of 3</p>
        </div>

        {/* PART 1: The Bright Side */}
        {currentPart === 1 && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="border-4 border-[#E3B84B] rounded-lg p-6 h-96 flex items-center justify-center">
                <img src="/assets/sonia.png" alt="Sonia the fortune teller" style={{width: "280px", height: "auto"}} />
              </div>

              <div className="bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8">
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#E3B84B" }}>
                  The Bright Side
                </h2>
                {isLoadingReadings && !aiBrightSide ? (
                  <div className="mb-8 space-y-3">
                    <div className="reading-shimmer h-4 w-full" />
                    <div className="reading-shimmer h-4 w-5/6" />
                    <div className="reading-shimmer h-4 w-4/5" />
                    <div className="reading-shimmer h-4 w-full" />
                    <p className="text-[#D4C5F9]/60 text-sm mt-4">Sonia is channeling the stars...</p>
                  </div>
                ) : (
                  <p className="text-[#D4C5F9] leading-relaxed text-lg mb-8">{displayBrightSide}</p>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleShare(displayBrightSide)}
                    disabled={isLoadingReadings && !aiBrightSide}
                    className="px-6 py-2 bg-[#E3B84B]/20 text-[#E3B84B] rounded-lg hover:bg-[#E3B84B]/30 transition font-semibold disabled:opacity-40"
                  >
                    {copied ? "✓ Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => setCurrentPart(2)}
                    className="flex-1 px-8 py-3 bg-[#E3B84B] text-[#0B0B14] rounded-lg hover:opacity-90 transition font-semibold"
                  >
                    Continue to the Horror Mirror →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PART 2: The Horror Mirror */}
        {currentPart === 2 && (
          <div className="space-y-8">
            <style>{`
              @keyframes screen-flicker {
                0%, 100% { opacity: 1; }
                10% { opacity: 0.95; }
                20% { opacity: 1; }
                30% { opacity: 0.92; }
                40% { opacity: 1; }
              }
              .flicker {
                animation: screen-flicker 0.5s infinite;
              }
            `}</style>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flicker border-4 rounded-lg p-6 h-96 flex items-center justify-center" style={{ borderColor: "#2EE59D" }}>
                <img src="/assets/moira.png" alt="Moira" style={{width: "280px", height: "auto"}} />
              </div>

              <div className="bg-[#1A1A2E] rounded-lg p-8" style={{ borderColor: "#2EE59D", borderWidth: "2px" }}>
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#2EE59D" }}>
                  The Horror Mirror
                </h2>
                {isLoadingReadings && !aiHorrorMirror ? (
                  <div className="mb-8 space-y-3">
                    <div className="reading-shimmer h-4 w-full" />
                    <div className="reading-shimmer h-4 w-5/6" />
                    <div className="reading-shimmer h-4 w-4/5" />
                    <div className="reading-shimmer h-4 w-full" />
                    <p className="text-[#D4C5F9]/60 text-sm mt-4">Moira is peering into the mirror...</p>
                  </div>
                ) : (
                  <p className="text-[#D4C5F9] leading-relaxed text-lg mb-8">{displayHorrorMirror}</p>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleShare(displayHorrorMirror)}
                    disabled={isLoadingReadings && !aiHorrorMirror}
                    className="px-6 py-2 rounded-lg hover:opacity-80 transition font-semibold disabled:opacity-40"
                    style={{
                      backgroundColor: "#2EE59D/20",
                      color: "#2EE59D",
                    }}
                  >
                    {copied ? "✓ Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => setCurrentPart(3)}
                    className="flex-1 px-8 py-3 rounded-lg hover:opacity-90 transition font-semibold"
                    style={{
                      backgroundColor: "#2EE59D",
                      color: "#0B0B14",
                    }}
                  >
                    Change Your Fate →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PART 3: Change Your Fate */}
        {currentPart === 3 && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              <div className="border-4 border-[#E3B84B] rounded-lg p-6 h-96">
                <PortraitCrossfade
                  sliders={sliders}
                  isControlled={true}
                  className="h-full w-full object-cover object-top"
                />
                <p className="mt-3 text-sm text-[#D4C5F9]/80">
                  Omen Score: {omenScore}
                </p>
              </div>

              <div className="bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8">
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#E3B84B" }}>
                  Rewrite Your Destiny
                </h2>
                <p className="text-[#D4C5F9] mb-6">
                  Where do you stand on these cosmic scales? Your choices reshape your fate.
                </p>

                <div className="space-y-6">
                  {/* Slider 1 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Love
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.love}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.love}
                      onChange={(e) => handleSliderChange("love", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Playful heart</span>
                      <span>Full on soulmate mode</span>
                    </div>
                  </div>

                  {/* Slider 2 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Wealth
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.wealth}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.wealth}
                      onChange={(e) => handleSliderChange("wealth", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Living on ramen dreams</span>
                      <span>Caviar future plans</span>
                    </div>
                  </div>

                  {/* Slider 3 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Health
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.health}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.health}
                      onChange={(e) => handleSliderChange("health", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Energy slump</span>
                      <span>Yoga-challenge champion</span>
                    </div>
                  </div>

                  {/* Slider 4 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Fame
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.fame}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.fame}
                      onChange={(e) => handleSliderChange("fame", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Wallflower mode</span>
                      <span>Center stage aura</span>
                    </div>
                  </div>

                  {/* Slider 5 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Wisdom
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.wisdom}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.wisdom}
                      onChange={(e) => handleSliderChange("wisdom", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Blindly repeating memes</span>
                      <span>Ancient seer energy</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleRewriteFate}
                    className="flex-1 px-8 py-3 bg-[#E3B84B] text-[#0B0B14] rounded-lg hover:opacity-90 transition font-semibold"
                  >
                    Change Your Fate
                  </button>
                  <button
                    onClick={handleShareFate}
                    disabled={!fateMessage || isSharing}
                    className="flex-1 px-8 py-3 bg-[#E3B84B]/20 text-[#E3B84B] rounded-lg hover:bg-[#E3B84B]/30 transition font-semibold disabled:opacity-40"
                  >
                    {isSharing ? "Generating..." : copied ? "✓ Copied!" : "Share Your Fate"}
                  </button>
                </div>
                {shareStatus && <div className="text-xs text-[#D4C5F9]/80 mt-2">{shareStatus}</div>}
              </div>
            </div>

            {fateMessage && (
              <div
                className={`bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8 transition-opacity duration-500 ${
                  showFate ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="text-[#D4C5F9] text-lg leading-relaxed">{fateMessage}</p>
                {needsPass && (
                  <div className="mt-6 pt-6 border-t border-[#E3B84B]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-sm text-[#D4C5F9]/80">
                      That was a free glimpse. The Veil Season Pass unlocks unlimited fate rewrites through November 15.
                    </p>
                    <a
                      href={getRealPaymentLink() || "/pass"}
                      className="shrink-0 px-6 py-2 bg-[#E3B84B] text-[#0B0B14] rounded-lg hover:opacity-90 transition font-semibold whitespace-nowrap"
                    >
                      Get the Pass — $9.99
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#E3B84B]/20">
          <button
            onClick={() => setCurrentPart(Math.max(1, currentPart - 1))}
            disabled={currentPart === 1}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              currentPart === 1
                ? "bg-[#E3B84B]/20 text-[#D4C5F9]/50 cursor-not-allowed"
                : "bg-[#E3B84B]/20 text-[#E3B84B] hover:bg-[#E3B84B]/30"
            }`}
          >
            ← Back
          </button>

          <a
            href="/"
            className="text-[#D4C5F9] hover:text-[#E3B84B] transition font-semibold"
          >
            ← Return Home
          </a>
        </div>

        <div
          ref={shareCardRef}
          style={{
            position: "fixed",
            top: "-9999px",
            left: "-9999px",
            width: "1200px",
            height: "630px",
            opacity: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <ShareCard signLabel={signLabel} omenScore={omenScore} quote={fateMessage || "Your future awaits..."} />
        </div>
      </div>
    </div>
  );
}

export default function ReadingPage() {
  return (
    <Suspense fallback={<div style={{color:"white",padding:"2rem"}}>Loading...</div>}>
      <ReadingPageInner />
    </Suspense>
  );
}
